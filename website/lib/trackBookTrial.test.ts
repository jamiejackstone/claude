import { CONSENT_STORAGE_KEY } from './metaPixel.ts';
import { BOOK_TRIAL_CLICK_EVENT, trackBookTrialClick } from './trackBookTrial.ts';

function assert(condition: unknown, label: string): void {
  if (!condition) throw new Error(label);
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}\nactual:   ${a}\nexpected: ${b}`);
}

const TRIAL_URL = 'https://goteamup.com/p/6822945-hoop-heroes/memberships/166242/?gclid=TEST_HH&gbraid=GB&wbraid=WB';

function installBrowser(consent: string | null): { dataLayer: unknown[]; gtagCalls: number; fbqCalls: number } {
  const store = new Map<string, string>();
  if (consent) store.set(CONSENT_STORAGE_KEY, consent);
  const dataLayer: unknown[] = [];
  let gtagCalls = 0;
  let fbqCalls = 0;
  const w: Record<string, unknown> = {
    localStorage: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    },
    dataLayer,
    gtag: () => {
      gtagCalls += 1;
    },
    fbq: () => {
      fbqCalls += 1;
    },
  };
  (globalThis as { window?: unknown }).window = w;
  return {
    dataLayer,
    get gtagCalls() {
      return gtagCalls;
    },
    get fbqCalls() {
      return fbqCalls;
    },
  };
}

function click(partial?: Partial<{ location_slug: string; button_position: string; link_url: string }>) {
  const started = Date.now();
  const result = trackBookTrialClick({
    location_slug: partial?.location_slug ?? 'marlow',
    button_position: partial?.button_position ?? 'hero',
    link_url: partial?.link_url ?? TRIAL_URL,
  });
  assert(Date.now() - started < 50, 'push returns synchronously');
  assertEqual(result, undefined, 'push does not return a value that could cancel navigation');
}

{
  const harness = installBrowser(null);
  click();
  assertEqual(harness.dataLayer, [], 'no book_trial_click before a consent choice');
  assertEqual(harness.gtagCalls, 0, 'no gtag call without consent');
  assertEqual(harness.fbqCalls, 0, 'no pixel call without consent');
}

{
  const harness = installBrowser('rejected');
  click({ button_position: 'navbar' });
  assertEqual(harness.dataLayer, [], 'rejected consent does not push book_trial_click');
  assertEqual(harness.gtagCalls, 0, 'reject does not call gtag');
  assertEqual(harness.fbqCalls, 0, 'reject does not call the pixel');
}

{
  const harness = installBrowser('accepted');
  click();
  click({ location_slug: '  ', button_position: 'sticky', link_url: TRIAL_URL });
  assertEqual(harness.dataLayer, [
    {
      event: BOOK_TRIAL_CLICK_EVENT,
      location_slug: 'marlow',
      button_position: 'hero',
      link_url: TRIAL_URL,
    },
    {
      event: BOOK_TRIAL_CLICK_EVENT,
      location_slug: 'none',
      button_position: 'sticky',
      link_url: TRIAL_URL,
    },
  ], 'accepted consent pushes one event per click');
  assert(TRIAL_URL.includes('gclid=TEST_HH'), 'fixture keeps gclid');
  assert(TRIAL_URL.includes('gbraid=GB') && TRIAL_URL.includes('wbraid=WB'), 'fixture keeps gbraid and wbraid');
  assertEqual(
    (harness.dataLayer[0] as { link_url: string }).link_url,
    TRIAL_URL,
    'link_url is the CTA href, including click ids, unchanged',
  );
  assertEqual(harness.gtagCalls, 0, 'helper does not call gtag');
  assertEqual(harness.fbqCalls, 0, 'helper does not call the pixel');
}

{
  const harness = installBrowser('accepted');
  harness.dataLayer.push(['consent', 'default', { ad_storage: 'denied' }]);
  click({ location_slug: 'none', button_position: 'banner' });
  assertEqual(harness.dataLayer[0], ['consent', 'default', { ad_storage: 'denied' }], 'existing consent entries stay on the same dataLayer');
  assertEqual(harness.dataLayer[1], {
    event: 'book_trial_click',
    location_slug: 'none',
    button_position: 'banner',
    link_url: TRIAL_URL,
  }, 'homepage-style click uses location_slug none');
}

{
  const harness = installBrowser('accepted');
  delete (globalThis as { window?: { dataLayer?: unknown[] } }).window?.dataLayer;
  click({ location_slug: 'tring', button_position: 'navbar' });
  const created = (globalThis as { window?: { dataLayer?: unknown[] } }).window?.dataLayer;
  assert(Array.isArray(created) && created !== harness.dataLayer, 'a missing dataLayer is created');
  assertEqual(created?.[0], {
    event: 'book_trial_click',
    location_slug: 'tring',
    button_position: 'navbar',
    link_url: TRIAL_URL,
  }, 'created dataLayer receives the click');
}

{
  (globalThis as { window?: unknown }).window = undefined;
  trackBookTrialClick({ location_slug: 'marlow', button_position: 'hero', link_url: TRIAL_URL });
}

console.log('trackBookTrial tests passed');
