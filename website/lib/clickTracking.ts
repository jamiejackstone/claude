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
// Matches a typical Google Ads click-through window so a return visit in the
// same browser can still be tied to the ad click. sessionStorage covers the tab.
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
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
 * gclid is not here: a fake custom-field id is silently dropped, and the
 * `hh_gclid` alias id has not been issued yet.
 */
export const BRAID_CUSTOM_FIELDS = {
  gbraid: { id: 'Vco6cxY4VKBWQ9FPB6rQ', key: 'gbraid' },
  wbraid: { id: 'fMkXv33gXAGUuHBDcber', key: 'wbraid' },
} as const;

export interface GhlCustomFieldEntry {
  id: string;
  key: string;
  fieldValue: string;
}

/** LeadConnector customFields entries for gbraid and wbraid only. */
export function ghlBraidCustomFields(values: TrackedParams): GhlCustomFieldEntry[] {
  const entries: GhlCustomFieldEntry[] = [];
  for (const key of ['gbraid', 'wbraid'] as const) {
    const value = values[key];
    if (!value) continue;
    const field = BRAID_CUSTOM_FIELDS[key];
    entries.push({ id: field.id, key: field.key, fieldValue: value });
  }
  return entries;
}

/** GHL v1 `customField` id map for the same gbraid / wbraid fields. */
export function ghlV1BraidCustomField(values: TrackedParams): Record<string, string> | undefined {
  const customField: Record<string, string> = {};
  for (const entry of ghlBraidCustomFields(values)) {
    customField[entry.id] = entry.fieldValue;
  }
  return Object.keys(customField).length ? customField : undefined;
}

/**
 * TODO(hh_gclid): Systems is creating alias custom field `hh_gclid`.
 * When the real id and key arrive, return
 * `{ id, key: 'hh_gclid', fieldValue: values.gclid }` and include it beside the braid entries.
 * Do not invent an id. A customFields id of "gclid" and native contact.gclid are silently dropped.
 */
export function pendingHhGclidField(_values: TrackedParams): null {
  return null;
}

/** Landing-param names (`gclid`, `gbraid`, `wbraid`). gclid is not a CRM field id. */
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

function readStoredOnly(): TrackedParams {
  if (typeof window === 'undefined') return {};
  let fromSession = '';
  try {
    fromSession = sessionStorage.getItem(STORAGE_KEY) || '';
  } catch {
    fromSession = '';
  }
  return mergeTrackedParams(pickTrackedParams(readCookieValue()), pickTrackedParams(fromSession));
}

function readCookieValue(): string {
  if (typeof document === 'undefined') return '';
  const prefix = `${STORAGE_KEY}=`;
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      try {
        return decodeURIComponent(part.slice(prefix.length));
      } catch {
        return '';
      }
    }
  }
  return '';
}

function writeStored(params: TrackedParams): void {
  if (typeof window === 'undefined') return;
  const serialized = serializeTracked(params);
  try {
    sessionStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Private mode or blocked storage — cookie below still helps other tabs.
  }
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(serialized)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

/** Cookie + sessionStorage + the current URL. Current URL wins on conflict. */
export function readTrackedParams(): TrackedParams {
  if (typeof window === 'undefined') return {};
  return mergeTrackedParams(readStoredOnly(), pickTrackedParams(window.location.search));
}

/**
 * Persist click ids and UTMs present on this page load.
 * Later pages without the query still read the stored values.
 * A new click id replaces the stored one; other stored keys are kept.
 */
export function captureLandingClickIds(search?: string): TrackedParams {
  if (typeof window === 'undefined') return {};
  const incoming = pickTrackedParams(search ?? window.location.search);
  const existing = readStoredOnly();
  const merged = mergeTrackedParams(existing, incoming);
  if (hasTrackedParams(incoming) || (hasTrackedParams(existing) && !hasSessionCopy())) {
    writeStored(merged);
  }
  return readTrackedParams();
}

function hasSessionCopy(): boolean {
  try {
    return Boolean(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
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
