// Meta Pixel + Google Consent Mode helpers.
// The pixel id and localStorage key must match the inline script in index.html.
// Nothing here may contact Facebook until consent is exactly 'accepted'.

export const CONSENT_STORAGE_KEY = 'hoop_heroes_cookie_consent';
export const META_PIXEL_ID = '223540124858171';
const PIXEL_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

type ConsentState = 'granted' | 'denied';

interface ConsentFlags {
  ad_storage: ConsentState;
  analytics_storage: ConsentState;
  ad_user_data: ConsentState;
  ad_personalization: ConsentState;
}

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
};

interface PixelScript {
  async: boolean;
  src: string;
}

interface PixelDocument {
  createElement(tag: string): PixelScript;
  getElementsByTagName(tag: string): ArrayLike<{ parentNode: { insertBefore(node: PixelScript, child: unknown): void } | null }>;
  head?: { appendChild(node: PixelScript): void };
}

interface PixelWindow {
  fbq?: Fbq;
  _fbq?: unknown;
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  loadHoopHeroesMetaPixel?: () => void;
  localStorage: Pick<Storage, 'getItem'>;
  location?: { pathname?: string };
  document?: PixelDocument;
}

let pixelReady = false;
let lastPageViewPath: string | null = null;

function browserWindow(): PixelWindow | null {
  const candidate = (globalThis as { window?: PixelWindow }).window;
  if (!candidate || typeof candidate !== 'object') return null;
  return candidate;
}

function consentFlags(granted: boolean): ConsentFlags {
  const state: ConsentState = granted ? 'granted' : 'denied';
  return {
    ad_storage: state,
    analytics_storage: state,
    ad_user_data: state,
    ad_personalization: state,
  };
}

export function isConsented(): boolean {
  const w = browserWindow();
  if (!w) return false;
  try {
    return w.localStorage.getItem(CONSENT_STORAGE_KEY) === 'accepted';
  } catch {
    return false;
  }
}

function ensureGtag(w: PixelWindow): ((...args: unknown[]) => void) | null {
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag === 'function') return w.gtag;
  const dataLayer = w.dataLayer;
  // GTM only treats an Arguments object as a gtag command. A plain array is ignored.
  w.gtag = function gtag() {
    dataLayer.push(arguments as unknown);
  };
  return w.gtag;
}

/** Consent Mode v2 update. Granted on Accept; denied on Reject. */
export function updateGoogleConsent(granted: boolean): void {
  const w = browserWindow();
  if (!w) return;
  const gtag = ensureGtag(w);
  gtag?.('consent', 'update', consentFlags(granted));
}

export function pushDataLayerEvent(event: string): void {
  const w = browserWindow();
  if (!w) return;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event });
}

function installPixelStub(w: PixelWindow): void {
  if (typeof w.fbq === 'function') return;
  const doc = w.document;
  if (!doc) return;

  const n = function (...args: unknown[]) {
    if (typeof n.callMethod === 'function') {
      n.callMethod.apply(n, args);
    } else {
      n.queue.push(args);
    }
  } as Fbq;

  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  w.fbq = n;

  const script = doc.createElement('script');
  script.async = true;
  script.src = PIXEL_SRC;
  const first = doc.getElementsByTagName('script')[0];
  if (first?.parentNode) {
    first.parentNode.insertBefore(script, first);
  } else {
    doc.head?.appendChild(script);
  }

  n('init', META_PIXEL_ID);
}

/**
 * Load and init the pixel once. No-ops unless consent is already 'accepted',
 * and no-ops again if the inline page script (or an earlier call) already inited fbq.
 */
export function loadPixel(): void {
  if (!isConsented()) return;
  const w = browserWindow();
  if (!w || pixelReady || typeof w.fbq === 'function') {
    if (w && typeof w.fbq === 'function') pixelReady = true;
    return;
  }
  if (typeof w.loadHoopHeroesMetaPixel === 'function') {
    w.loadHoopHeroesMetaPixel();
  } else {
    installPixelStub(w);
  }
  pixelReady = true;
}

/**
 * One PageView per pathname. Repeating the same path (StrictMode, the Accept
 * click after the route effect, or a click-id query rewrite) does not send another.
 * A later, different pathname does.
 */
export function trackPageView(pathname?: string): void {
  if (!isConsented()) return;
  const w = browserWindow();
  if (!w) return;
  const path = pathname || w.location?.pathname || '';
  if (!path || path === lastPageViewPath) return;
  loadPixel();
  if (typeof w.fbq !== 'function') return;
  w.fbq('track', 'PageView');
  lastPageViewPath = path;
}

function createEventId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return `waitlist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Waitlist success. Lead is sent only when consent is accepted, which is also
 * when analytics_storage is granted, so the GA4 dataLayer event uses the same gate.
 * Returns the eventID when the lead was tracked.
 */
export function trackWaitlistLead(): string | null {
  if (!isConsented()) return null;
  const w = browserWindow();
  if (!w) return null;
  const eventID = createEventId();
  loadPixel();
  if (typeof w.fbq === 'function') {
    w.fbq('track', 'Lead', { content_name: 'waitlist' }, { eventID });
  }
  pushDataLayerEvent('waitlist_lead');
  return eventID;
}

/** Clears module dedupe flags. Tests only. */
export function resetMetaPixelForTests(): void {
  pixelReady = false;
  lastPageViewPath = null;
}
