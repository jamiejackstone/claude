// Google Ads click IDs and campaign UTMs. Measurement only:
// persist what arrived on the landing URL, then re-apply it to later
// pages and outbound TeamUp links. Never invent a click id.

export const CLICK_ID_PARAMS = ['gclid', 'gbraid', 'wbraid'] as const;
export const UTM_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
] as const;
export const TRACKED_PARAMS = [...CLICK_ID_PARAMS, ...UTM_PARAMS] as const;

export type ClickIdParam = (typeof CLICK_ID_PARAMS)[number];
export type TrackedParam = (typeof TRACKED_PARAMS)[number];
export type TrackedParams = Partial<Record<TrackedParam, string>>;

const STORAGE_KEY = 'hh_click_ids';
/** First-party cookie. gclid, gbraid and wbraid are separate keys inside it. */
export const CLICK_COOKIE_NAME = STORAGE_KEY;
/** About 90 days, in line with a typical Google Ads click-through window. */
export const CLICK_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
const MAX_VALUE_LENGTH = 512;

export function sanitizeTrackedValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_VALUE_LENGTH) return null;
  if (/[\u0000-\u001F\u007F<>"'\\]/.test(trimmed)) return null;
  return trimmed;
}

export function pickTrackedParams(search: string): TrackedParams {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const out: TrackedParams = {};
  for (const key of TRACKED_PARAMS) {
    const value = params.get(key);
    if (!value) continue;
    const clean = sanitizeTrackedValue(value);
    if (clean) out[key] = clean;
  }
  return out;
}

export function mergeTrackedParams(...sources: TrackedParams[]): TrackedParams {
  const out: TrackedParams = {};
  for (const source of sources) {
    for (const key of TRACKED_PARAMS) {
      const value = source[key];
      if (value) out[key] = value;
    }
  }
  return out;
}

export function hasTrackedParams(params: TrackedParams): boolean {
  return TRACKED_PARAMS.some((key) => Boolean(params[key]));
}

export function clickIdsFromRecord(record: Record<string, unknown>): TrackedParams {
  const search = new URLSearchParams();
  for (const key of CLICK_ID_PARAMS) {
    const value = record[key];
    if (typeof value === 'string') search.set(key, value);
  }
  return pickTrackedParams(search.toString());
}

/**
 * Verified writable TEXT fields on Hoop Heroes location 9p0wEiLpTaIe1FDTFFQI.
 * Landing param `gclid` is stored as custom field `hh_gclid`. Native contact.gclid
 * is not writable via the API and is never sent.
 */
export const CLICK_ID_CUSTOM_FIELDS = [
  { param: 'gclid', id: '9frYn0xCQ45lkz4R6q0e', key: 'hh_gclid' },
  { param: 'gbraid', id: 'Vco6cxY4VKBWQ9FPB6rQ', key: 'gbraid' },
  { param: 'wbraid', id: 'fMkXv33gXAGUuHBDcber', key: 'wbraid' },
] as const;

export interface GhlCustomFieldEntry {
  id: string;
  key: string;
  fieldValue: string;
}

/** LeadConnector customFields entries for hh_gclid, gbraid, and wbraid. */
export function ghlClickIdCustomFields(values: TrackedParams): GhlCustomFieldEntry[] {
  const entries: GhlCustomFieldEntry[] = [];
  for (const field of CLICK_ID_CUSTOM_FIELDS) {
    const value = values[field.param];
    if (!value) continue;
    entries.push({ id: field.id, key: field.key, fieldValue: value });
  }
  return entries;
}

/** GHL v1 `customField` id map for the same click-id fields. */
export function ghlV1ClickIdCustomField(values: TrackedParams): Record<string, string> | undefined {
  const customField: Record<string, string> = {};
  for (const entry of ghlClickIdCustomFields(values)) {
    customField[entry.id] = entry.fieldValue;
  }
  return Object.keys(customField).length ? customField : undefined;
}

/** Landing-param names (`gclid`, `gbraid`, `wbraid`). CRM stores gclid as hh_gclid. */
export function clickIdFields(params: TrackedParams): Partial<Record<ClickIdParam, string>> {
  const out: Partial<Record<ClickIdParam, string>> = {};
  for (const key of CLICK_ID_PARAMS) {
    const value = params[key];
    if (value) out[key] = value;
  }
  return out;
}

/**
 * Append stored/current click ids and UTMs onto an absolute URL.
 * Existing query keys on the destination (e.g. TeamUp `venues`) are left as-is.
 * Returns the original string when there is nothing to add.
 */
export function withTrackedParams(url: string, tracked?: TrackedParams): string {
  const params = tracked ?? readTrackedParams();
  if (!hasTrackedParams(params)) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  let changed = false;
  for (const key of TRACKED_PARAMS) {
    const value = params[key];
    if (!value || parsed.searchParams.has(key)) continue;
    parsed.searchParams.set(key, value);
    changed = true;
  }
  return changed ? parsed.toString() : url;
}

/** Keep `target`'s own query, then append incoming keys it does not already have. */
export function mergeIncomingSearch(target: string, base: string, incoming: URLSearchParams): string {
  const dest = new URL(target, base);
  incoming.forEach((value, key) => {
    if (!value || dest.searchParams.has(key)) return;
    dest.searchParams.append(key, value);
  });
  return dest.toString();
}

/**
 * Print QR destination. Print UTMs stay authoritative.
 * gclid / gbraid / wbraid from the incoming query are merged in.
 */
export function buildGoDestination(origin: string, slug: string, utmSource: string, incomingSearch: string): string {
  const destination = new URL(`/location/${slug}`, origin);
  destination.searchParams.set('utm_source', utmSource);
  destination.searchParams.set('utm_medium', 'print');
  destination.searchParams.set('utm_campaign', 'sep26');
  destination.searchParams.set('utm_content', slug);
  const clickIds = pickTrackedParams(incomingSearch);
  for (const key of CLICK_ID_PARAMS) {
    const value = clickIds[key];
    if (value) destination.searchParams.set(key, value);
  }
  return destination.toString();
}

function serializeTracked(params: TrackedParams): string {
  const search = new URLSearchParams();
  for (const key of TRACKED_PARAMS) {
    const value = params[key];
    if (value) search.set(key, value);
  }
  return search.toString();
}

/** Set-Cookie assignment: Path=/, SameSite=Lax, Secure on https, Max-Age ~90 days. */
export function buildClickCookie(serialized: string, secure: boolean): string {
  const secureAttr = secure ? '; Secure' : '';
  return `${CLICK_COOKIE_NAME}=${encodeURIComponent(serialized)}; Path=/; Max-Age=${CLICK_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secureAttr}`;
}

/** Decoded value of hh_click_ids from a document.cookie or Cookie header. */
export function readClickCookieValue(cookieHeader: string, name = CLICK_COOKIE_NAME): string {
  if (!cookieHeader) return '';
  const prefix = `${name}=`;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(prefix)) continue;
    try {
      return decodeURIComponent(trimmed.slice(prefix.length));
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Click ids for a page view.
 * Session is the lowest layer, then the cookie, then the URL.
 * A new id on the URL replaces only that id.
 */
export function resolveTrackedParams(input: {
  session?: string | null;
  cookie?: string;
  search?: string;
}): TrackedParams {
  return mergeTrackedParams(
    pickTrackedParams(input.session || ''),
    pickTrackedParams(readClickCookieValue(input.cookie || '')),
    pickTrackedParams(input.search || ''),
  );
}

/**
 * Search string with cookie click ids filled in where the URL has none.
 * Returns null when the URL already has every stored click id.
 */
export function restoreSearchFromClickCookie(search: string, cookieHeader: string): string | null {
  const stored = clickIdFields(pickTrackedParams(readClickCookieValue(cookieHeader)));
  const current = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  let changed = false;
  for (const key of CLICK_ID_PARAMS) {
    const value = stored[key];
    if (!value || current.get(key)) continue;
    current.set(key, value);
    changed = true;
  }
  if (!changed) return null;
  const next = current.toString();
  return next ? `?${next}` : null;
}

export interface ClickIdBrowser {
  getCookie(): string;
  setCookie(value: string): void;
  getSession(): string | null;
  setSession(value: string): void;
  getSearch(): string;
  getProtocol(): string;
}

/**
 * Persist click ids from this page load.
 * A new click id replaces the stored one. Other stored ids are kept.
 */
export function captureClickIds(browser: ClickIdBrowser, search?: string): TrackedParams {
  const incoming = pickTrackedParams(search ?? browser.getSearch());
  const existing = resolveTrackedParams({
    session: browser.getSession(),
    cookie: browser.getCookie(),
    search: '',
  });
  const merged = mergeTrackedParams(existing, incoming);
  if (hasTrackedParams(incoming) || (hasTrackedParams(existing) && !browser.getSession())) {
    const serialized = serializeTracked(merged);
    browser.setSession(serialized);
    browser.setCookie(buildClickCookie(serialized, browser.getProtocol() === 'https:'));
  }
  return resolveTrackedParams({
    session: browser.getSession(),
    cookie: browser.getCookie(),
    search: browser.getSearch(),
  });
}

function browserClickStore(): ClickIdBrowser | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  return {
    getCookie: () => document.cookie || '',
    setCookie: (value) => {
      document.cookie = value;
    },
    getSession: () => {
      try {
        return sessionStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    },
    setSession: (value) => {
      try {
        sessionStorage.setItem(STORAGE_KEY, value);
      } catch {
        // Private mode or blocked storage. The cookie still covers later visits.
      }
    },
    getSearch: () => window.location.search || '',
    getProtocol: () => window.location.protocol || '',
  };
}

/** Cookie, then the current URL. The URL wins when both have the same key. */
export function readTrackedParams(): TrackedParams {
  const store = browserClickStore();
  if (!store) return {};
  return resolveTrackedParams({
    session: store.getSession(),
    cookie: store.getCookie(),
    search: store.getSearch(),
  });
}

/**
 * Persist click ids and UTMs present on this page load.
 * Later pages without the query still read the stored values.
 * A new click id replaces the stored one; other stored keys are kept.
 */
export function captureLandingClickIds(search?: string): TrackedParams {
  const store = browserClickStore();
  if (!store) return {};
  return captureClickIds(store, search);
}

/** Click ids only, for POST /api/waitlist and POST /api/contact. */
export function getClickIdsForLead(): Partial<Record<ClickIdParam, string>> {
  return clickIdFields(readTrackedParams());
}

/** Internal path (pathname + search + hash) with stored click ids / UTMs merged in. */
export function pathWithTrackedParams(path: string): string {
  const url = new URL(path, 'https://www.hoopheroes.co.uk');
  const tracked = readTrackedParams();
  for (const key of TRACKED_PARAMS) {
    const value = tracked[key];
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
