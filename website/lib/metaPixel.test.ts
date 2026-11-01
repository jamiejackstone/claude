import {
  CONSENT_STORAGE_KEY,
  META_PIXEL_ID,
  isConsented,
  loadPixel,
  pushDataLayerEvent,
  resetMetaPixelForTests,
  trackPageView,
  trackWaitlistLead,
  updateGoogleConsent,
} from './metaPixel.ts';

function assert(condition: unknown, label: string): void {
  if (!condition) throw new Error(label);
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}\nactual:   ${a}\nexpected: ${b}`);
}

interface Harness {
  fbqCalls: unknown[][];
  pixelLoads: number;
  gtagCalls: unknown[][];
  dataLayer: unknown[];
  scripts: { async: boolean; src: string }[];
  setConsent: (value: string | null) => void;
}

function installBrowser(options?: { consent?: string | null; inlineLoader?: boolean }): Harness {
  resetMetaPixelForTests();
  const store = new Map<string, string>();
  if (options?.consent) store.set(CONSENT_STORAGE_KEY, options.consent);
  const fbqCalls: unknown[][] = [];
  const gtagCalls: unknown[][] = [];
  const dataLayer: unknown[] = [];
  const scripts: { async: boolean; src: string }[] = [];
  let pixelLoads = 0;

  const w: Record<string, unknown> = {
    localStorage: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    },
    location: { pathname: '/' },
    dataLayer,
    document: {
      createElement: () => {
        const el = { async: false, src: '' };
        scripts.push(el);
        return el;
      },
      getElementsByTagName: () => [],
      head: { appendChild: () => undefined },
    },
  };

  w.gtag = function gtag() {
    const args = Array.prototype.slice.call(arguments) as unknown[];
    gtagCalls.push(args);
    dataLayer.push(args);
  };

  if (options?.inlineLoader !== false) {
    w.loadHoopHeroesMetaPixel = () => {
      pixelLoads += 1;
      if (typeof w.fbq === 'function') return;
      const fbq = (...args: unknown[]) => {
        fbqCalls.push(args);
      };
      w.fbq = fbq;
      fbq('init', META_PIXEL_ID);
    };
  }

  (globalThis as { window?: unknown }).window = w;

  return {
    fbqCalls,
    get pixelLoads() {
      return pixelLoads;
    },
    gtagCalls,
    dataLayer,
    scripts,
    setConsent: (value) => {
      if (value == null) store.delete(CONSENT_STORAGE_KEY);
      else store.set(CONSENT_STORAGE_KEY, value);
    },
  };
}

function pageViews(calls: unknown[][]): unknown[][] {
  return calls.filter((call) => call[0] === 'track' && call[1] === 'PageView');
}

async function readIndexHtml(): Promise<string> {
  // This package has no @types/node. Importing node:fs directly fails `tsc`.
  const fs = await (new Function('return import("node:fs")')() as Promise<{
    readFileSync: (path: string, encoding: 'utf8') => string;
  }>);
  const path = await (new Function('return import("node:path")')() as Promise<{
    dirname: (p: string) => string;
    join: (...parts: string[]) => string;
  }>);
  const url = await (new Function('return import("node:url")')() as Promise<{
    fileURLToPath: (u: string) => string;
  }>);
  const here = path.dirname(url.fileURLToPath(import.meta.url));
  return fs.readFileSync(path.join(here, '../index.html'), 'utf8');
}

const html = await readIndexHtml();
const consentAt = html.indexOf("gtag('consent', 'default'");
const gtmAt = html.indexOf('https://www.googletagmanager.com/gtm.js');
assert(consentAt !== -1 && gtmAt !== -1 && consentAt < gtmAt, 'consent default is before GTM');
assert(html.includes('GTM-WBRDHQ5T'), 'gtm container kept');
assert(html.includes('wait_for_update: 500'), 'wait_for_update 500');
assert(html.includes("ad_storage: 'denied'"), 'default ad_storage denied');
assert(html.includes("analytics_storage: 'denied'"), 'default analytics_storage denied');
assert(html.includes("ad_user_data: 'denied'"), 'default ad_user_data denied');
assert(html.includes("ad_personalization: 'denied'"), 'default ad_personalization denied');
assert(html.includes("ad_storage: 'granted'"), 'update can grant ad_storage');
assert(html.includes("=== 'accepted'"), 'stored accept is the gate');
assert(!html.includes('facebook.com/tr'), 'noscript PageView image removed');
assert(!html.includes('rel="preconnect" href="https://connect.facebook.net"'), 'no facebook preconnect');
assert(!html.includes("fbq('track'"), 'html does not fire pixel events');
assertEqual(html.split("fbq('init'").length - 1, 1, 'one pixel init');
assertEqual(html.split('loadHoopHeroesMetaPixel()').length - 1, 1, 'loader invoked once');
const acceptedAt = html.indexOf("=== 'accepted'");
const loadAt = html.indexOf('loadHoopHeroesMetaPixel()');
assert(acceptedAt !== -1 && acceptedAt < loadAt && loadAt < gtmAt, 'pixel loads only inside the accepted branch, before GTM');
assert(html.includes(`fbq('init', '${META_PIXEL_ID}')`), 'pixel id');
assert(html.includes(`localStorage.getItem('${CONSENT_STORAGE_KEY}')`), 'consent storage key');
assert(html.includes("event: 'cookie_consent_accepted'"), 'returning visitors push the GTM event');

{
  const harness = installBrowser();
  assertEqual(isConsented(), false, 'missing consent is not accepted');
  loadPixel();
  trackPageView('/');
  assertEqual(harness.pixelLoads, 0, 'no pixel load without consent');
  assertEqual(harness.fbqCalls, [], 'no fbq calls without consent');
  assertEqual(harness.scripts, [], 'fallback injector stays idle without consent');
  const lead = trackWaitlistLead();
  assertEqual(lead, null, 'waitlist lead skipped without consent');
  assertEqual(harness.dataLayer.some((entry) => JSON.stringify(entry).includes('waitlist_lead')), false, 'no waitlist_lead without consent');
}

{
  const harness = installBrowser({ consent: 'rejected' });
  assertEqual(isConsented(), false, 'rejected is not accepted');
  loadPixel();
  trackPageView('/');
  trackWaitlistLead();
  assertEqual(harness.pixelLoads, 0, 'reject loads no pixel');
  assertEqual(pageViews(harness.fbqCalls).length, 0, 'reject sends no PageView');
  updateGoogleConsent(false);
  const update = harness.gtagCalls.find((call) => call[0] === 'consent' && call[1] === 'update');
  assert(update, 'reject updates consent');
  const flags = update?.[2] as Record<string, string>;
  assertEqual(flags.ad_storage, 'denied', 'reject ad_storage');
  assertEqual(flags.analytics_storage, 'denied', 'reject analytics_storage');
  assertEqual(flags.ad_user_data, 'denied', 'reject ad_user_data');
  assertEqual(flags.ad_personalization, 'denied', 'reject ad_personalization');
}

{
  const harness = installBrowser();
  trackPageView('/');
  harness.setConsent('accepted');
  updateGoogleConsent(true);
  loadPixel();
  trackPageView('/');
  trackPageView('/');
  assertEqual(harness.pixelLoads, 1, 'accept loads the pixel once');
  assertEqual(pageViews(harness.fbqCalls).length, 1, 'accept fires one PageView');
  assertEqual(harness.fbqCalls.filter((call) => call[0] === 'init').length, 1, 'pixel inits once');
  const update = harness.gtagCalls.find((call) => call[0] === 'consent' && call[1] === 'update');
  const flags = update?.[2] as Record<string, string>;
  assertEqual(flags.ad_storage, 'granted', 'accept ad_storage');
  assertEqual(flags.analytics_storage, 'granted', 'accept analytics_storage');
  assertEqual(flags.ad_user_data, 'granted', 'accept ad_user_data');
  assertEqual(flags.ad_personalization, 'granted', 'accept ad_personalization');
  pushDataLayerEvent('cookie_consent_accepted');
  assert(
    harness.dataLayer.some((entry) => JSON.stringify(entry) === JSON.stringify({ event: 'cookie_consent_accepted' })),
    'accept pushes cookie_consent_accepted',
  );
  trackPageView('/mission');
  assertEqual(pageViews(harness.fbqCalls).length, 2, 'a new pathname sends another PageView');
  trackPageView('/mission');
  assertEqual(pageViews(harness.fbqCalls).length, 2, 'same pathname does not double count');
}

{
  const harness = installBrowser({ consent: 'accepted' });
  trackPageView('/');
  trackPageView('/');
  loadPixel();
  assertEqual(harness.pixelLoads, 1, 'return visit loads pixel once');
  assertEqual(pageViews(harness.fbqCalls).length, 1, 'return visit PageView once');
  const first = trackWaitlistLead();
  const second = trackWaitlistLead();
  assert(typeof first === 'string' && first.length > 0, 'lead eventID');
  assert(second !== first, 'lead eventIDs are unique');
  const leads = harness.fbqCalls.filter((call) => call[0] === 'track' && call[1] === 'Lead');
  assertEqual(leads.length, 2, 'two consented leads');
  assertEqual(leads[0][2], { content_name: 'waitlist' }, 'lead content_name');
  assertEqual((leads[0][3] as { eventID: string }).eventID, first, 'lead eventID forwarded');
  const leadEvents = harness.dataLayer.filter((entry) => JSON.stringify(entry) === JSON.stringify({ event: 'waitlist_lead' }));
  assertEqual(leadEvents.length, 2, 'waitlist_lead pushed when analytics is granted');
}

{
  const harness = installBrowser({ consent: 'accepted', inlineLoader: false });
  loadPixel();
  loadPixel();
  assertEqual(harness.scripts.length, 1, 'fallback injector inserts one script');
  assert(harness.scripts[0].src.includes('connect.facebook.net/en_US/fbevents.js'), 'fallback script src');
  assertEqual(harness.scripts[0].async, true, 'fallback script is async');
  const queued = (globalThis as { window?: { fbq?: { queue?: unknown[][] } } }).window?.fbq?.queue ?? [];
  assertEqual(queued[0], ['init', META_PIXEL_ID], 'fallback inits once');
}

console.log('metaPixel tests passed');
