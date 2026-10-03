import {
  buildClickCookie,
  buildGoDestination,
  captureClickIds,
  type ClickIdBrowser,
  CLICK_COOKIE_MAX_AGE_SECONDS,
  CLICK_COOKIE_NAME,
  clickIdFields,
  clickIdsFromRecord,
  ghlClickIdCustomFields,
  ghlV1ClickIdCustomField,
  mergeIncomingSearch,
  pickTrackedParams,
  readClickCookieValue,
  resolveTrackedParams,
  restoreSearchFromClickCookie,
  withTrackedParams,
} from './clickTracking.ts';
import {
  careersRequestBody,
  ghlHiddenClickInputs,
  waitlistRequestBody,
  withGhlFormClickFields,
  ACCIDENT_FORM_URL,
} from './leadPayloads.ts';

function assert(condition: unknown, label: string): void {
  if (!condition) throw new Error(label);
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}\nactual:   ${a}\nexpected: ${b}`);
}

function searchRecord(url: string): Record<string, string> {
  const params = new URL(url).searchParams;
  const out: Record<string, string> = {};
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

const tracked = {
  gclid: 'TEST_HH_20260923',
  utm_source: 'google',
  utm_medium: 'cpc',
  utm_campaign: 'taster',
};

const freeTrial = 'https://goteamup.com/p/6822945-hoop-heroes/memberships/166242/';
const paidMemberships = 'https://goteamup.com/p/6822945-hoop-heroes/memberships/';
const schedule = 'https://goteamup.com/p/6822945-hoop-heroes/c/schedule?venues=53603';

const withTrial = withTrackedParams(freeTrial, tracked);
assert(withTrial.startsWith(`${freeTrial}?`), 'free trial base path and trailing slash stay put');
assertEqual(searchRecord(withTrial).gclid, 'TEST_HH_20260923', 'free trial gains gclid');
assertEqual(searchRecord(withTrial).utm_source, 'google', 'free trial gains utm_source');
assert(!withTrial.includes('166242/166242'), 'membership id is not duplicated');

const withPaid = withTrackedParams(paidMemberships, { gclid: 'TEST_HH_20260923' });
assert(withPaid.startsWith(`${paidMemberships}?`), 'paid memberships URL gets a query only');
assert(!/memberships\/\d/.test(withPaid), 'paid memberships URL does not gain a membership id');

const withSchedule = withTrackedParams(schedule, { gclid: 'TEST_HH_20260923', gbraid: 'GB', wbraid: 'WB' });
assertEqual(searchRecord(withSchedule).venues, '53603', 'schedule venues query is kept');
assertEqual(searchRecord(withSchedule).gclid, 'TEST_HH_20260923', 'schedule gains gclid');
assertEqual(searchRecord(withSchedule).gbraid, 'GB', 'schedule gains gbraid');
assertEqual(searchRecord(withSchedule).wbraid, 'WB', 'schedule gains wbraid');

assertEqual(withTrackedParams(freeTrial, {}), freeTrial, 'no tracked params returns the original URL');
assertEqual(
  withTrackedParams(`${freeTrial}?gclid=ALREADY`, { gclid: 'NEW' }),
  `${freeTrial}?gclid=ALREADY`,
  'destination gclid is not overwritten',
);

assertEqual(pickTrackedParams('?gclid='), {}, 'empty gclid is not stored');
assertEqual(pickTrackedParams('?gclid=TEST&unrelated=1').gclid, 'TEST', 'unrelated params are ignored');
assertEqual(pickTrackedParams('?gclid=%3Cscript%3E'), {}, 'angle brackets are rejected');

const legacy = mergeIncomingSearch(
  '/policies?section=terms',
  'https://www.hoopheroes.co.uk',
  new URLSearchParams('gclid=TEST&utm_source=google&section=evil'),
);
assertEqual(searchRecord(legacy).section, 'terms', 'legacy redirect keeps its own query');
assertEqual(searchRecord(legacy).gclid, 'TEST', 'legacy redirect merges incoming gclid');
assertEqual(searchRecord(legacy).utm_source, 'google', 'legacy redirect merges incoming utm');
assert(legacy.startsWith('https://www.hoopheroes.co.uk/policies?'), 'legacy redirect stays on the policies path');

const plain = mergeIncomingSearch('/location/tring', 'https://www.hoopheroes.co.uk', new URLSearchParams('gclid=TEST'));
assertEqual(searchRecord(plain).gclid, 'TEST', 'redirect with no query of its own keeps gclid');

const go = buildGoDestination(
  'https://www.hoopheroes.co.uk',
  'tring',
  'banner',
  '?src=banner&gclid=TEST&gbraid=GB&wbraid=WB&utm_source=should-not-win',
);
assertEqual(searchRecord(go).utm_source, 'banner', 'print utm_source stays authoritative');
assertEqual(searchRecord(go).utm_medium, 'print', 'print utm_medium is set');
assertEqual(searchRecord(go).utm_campaign, 'sep26', 'print utm_campaign is set');
assertEqual(searchRecord(go).utm_content, 'tring', 'print utm_content is the slug');
assertEqual(searchRecord(go).gclid, 'TEST', '/go merges gclid');
assertEqual(searchRecord(go).gbraid, 'GB', '/go merges gbraid');
assertEqual(searchRecord(go).wbraid, 'WB', '/go merges wbraid');
assert(!('src' in searchRecord(go)), '/go does not forward src');
assert(go.includes('/location/tring'), '/go destination path');

const clickFields = ghlClickIdCustomFields({ gclid: 'TEST_HH_20260923', gbraid: 'GB', wbraid: 'WB' });
assertEqual(clickFields, [
  { id: '9frYn0xCQ45lkz4R6q0e', key: 'hh_gclid', fieldValue: 'TEST_HH_20260923' },
  { id: 'Vco6cxY4VKBWQ9FPB6rQ', key: 'gbraid', fieldValue: 'GB' },
  { id: 'fMkXv33gXAGUuHBDcber', key: 'wbraid', fieldValue: 'WB' },
], 'gclid, gbraid, and wbraid use the verified field ids');
assert(!JSON.stringify(clickFields).includes('"key":"gclid"'), 'native contact.gclid key is not sent');
assertEqual(ghlClickIdCustomFields({ gbraid: 'GB' }), [
  { id: 'Vco6cxY4VKBWQ9FPB6rQ', key: 'gbraid', fieldValue: 'GB' },
], 'a missing gclid is omitted');
assertEqual(ghlV1ClickIdCustomField({ gclid: 'TEST', gbraid: 'GB' }), {
  '9frYn0xCQ45lkz4R6q0e': 'TEST',
  Vco6cxY4VKBWQ9FPB6rQ: 'GB',
}, 'v1 customField is the click-id id map');

assertEqual(clickIdFields({ gclid: 'TEST', utm_source: 'google' }), { gclid: 'TEST' }, 'lead payload is click ids only');
assertEqual(clickIdsFromRecord({ gclid: ' TEST ', gbraid: 1, wbraid: '' }), { gclid: 'TEST' }, 'non-strings and blanks are dropped');

assertEqual(CLICK_COOKIE_MAX_AGE_SECONDS, 60 * 60 * 24 * 90, 'cookie max-age is 90 days');
const secureCookie = buildClickCookie('gclid=OLD&gbraid=B&wbraid=W', true);
assert(secureCookie.startsWith(`${CLICK_COOKIE_NAME}=`), 'cookie name is hh_click_ids');
assert(secureCookie.includes('Path=/'), 'cookie path is /');
assert(secureCookie.includes('SameSite=Lax'), 'cookie SameSite is Lax');
assert(secureCookie.includes('; Secure'), 'https cookie is Secure');
assert(secureCookie.includes(`Max-Age=${CLICK_COOKIE_MAX_AGE_SECONDS}`), 'cookie Max-Age is 90 days');
const plainCookie = buildClickCookie('gclid=OLD', false);
assert(!plainCookie.includes('Secure'), 'http cookie omits Secure');
assertEqual(
  readClickCookieValue(secureCookie),
  'gclid=OLD&gbraid=B&wbraid=W',
  'cookie value keeps gclid, gbraid and wbraid as separate keys',
);

class MemoryBrowser implements ClickIdBrowser {
  cookie = '';
  session: string | null = null;
  search = '';
  protocol = 'https:';
  assigned = '';
  getCookie(): string { return this.cookie; }
  setCookie(value: string): void {
    this.assigned = value;
    this.cookie = value.split(';')[0];
  }
  getSession(): string | null { return this.session; }
  setSession(value: string): void { this.session = value; }
  getSearch(): string { return this.search; }
  getProtocol(): string { return this.protocol; }
}

const memory = new MemoryBrowser();
memory.search = '?gclid=OLD&gbraid=B&wbraid=W';
const first = captureClickIds(memory);
assertEqual(first.gclid, 'OLD', 'landing gclid is stored');
assertEqual(first.gbraid, 'B', 'landing gbraid is stored');
assertEqual(first.wbraid, 'W', 'landing wbraid is stored');
assert(memory.assigned.includes('SameSite=Lax'), 'set cookie is SameSite=Lax');
assert(memory.assigned.includes('; Secure'), 'set cookie is Secure on https');
assert(memory.assigned.includes('Path=/'), 'set cookie path is /');
assert(memory.assigned.includes(`Max-Age=${CLICK_COOKIE_MAX_AGE_SECONDS}`), 'set cookie expires in 90 days');

memory.search = '?gclid=NEW';
const lastClick = captureClickIds(memory);
assertEqual(lastClick.gclid, 'NEW', 'last click replaces gclid');
assertEqual(lastClick.gbraid, 'B', 'last click keeps gbraid');
assertEqual(lastClick.wbraid, 'W', 'last click keeps wbraid');
const rewritten = readClickCookieValue(memory.assigned);
assert(rewritten.includes('gclid=NEW'), 'rewritten cookie stores the new gclid');
assert(rewritten.includes('gbraid=B'), 'rewritten cookie still stores gbraid');
assert(rewritten.includes('wbraid=W'), 'rewritten cookie still stores wbraid');

memory.search = '';
const fromCookie = captureClickIds(memory);
assertEqual(fromCookie.gclid, 'NEW', 'a later page reads gclid back from the cookie');
assertEqual(fromCookie.gbraid, 'B', 'a later page reads gbraid back from the cookie');
assertEqual(fromCookie.wbraid, 'W', 'a later page reads wbraid back from the cookie');

const expired = new MemoryBrowser();
expired.cookie = '';
expired.search = '';
assertEqual(captureClickIds(expired), {}, 'an expired or missing cookie does not invent click ids');

assertEqual(
  resolveTrackedParams({
    session: 'gclid=SESSION&gbraid=OLD',
    cookie: `${CLICK_COOKIE_NAME}=${encodeURIComponent('gclid=COOKIE&gbraid=B')}`,
    search: '?gclid=URL',
  }),
  { gclid: 'URL', gbraid: 'B' },
  'read order is session, then cookie, then URL',
);

assertEqual(
  restoreSearchFromClickCookie('', memory.cookie),
  '?gclid=NEW&gbraid=B&wbraid=W',
  'cookie click ids are restored onto an empty URL',
);
assertEqual(
  restoreSearchFromClickCookie('?gclid=KEEP', memory.cookie),
  '?gclid=KEEP&gbraid=B&wbraid=W',
  'restore does not overwrite a gclid already on the URL',
);

const ids = { gclid: 'GCLID1', gbraid: 'GBRAID1', wbraid: 'WBRAID1' };
const waitlist = waitlistRequestBody({
  name: 'Pat Parent',
  email: 'pat@example.com',
  phone: '07123456789',
  locationName: 'Sandhurst',
  clickIds: ids,
});
assertEqual(waitlist.gclid, 'GCLID1', 'waitlist payload carries gclid');
assertEqual(waitlist.gbraid, 'GBRAID1', 'waitlist payload carries gbraid');
assertEqual(waitlist.wbraid, 'WBRAID1', 'waitlist payload carries wbraid');

const careers = careersRequestBody({
  name: 'Ada Coach',
  email: 'ada@example.com',
  phone: '07111 222333',
  location: 'Oxford',
  about: 'I coach',
  role: 'Head Coach',
  clickIds: ids,
});
assertEqual(careers.type, 'careers', 'careers payload type');
assertEqual(careers.gclid, 'GCLID1', 'careers payload carries gclid');
assertEqual(careers.gbraid, 'GBRAID1', 'careers payload carries gbraid');
assertEqual(careers.wbraid, 'WBRAID1', 'careers payload carries wbraid');

const hidden = ghlHiddenClickInputs(ids);
assertEqual(hidden, [
  { name: 'hh_gclid', value: 'GCLID1' },
  { name: 'gbraid', value: 'GBRAID1' },
  { name: 'wbraid', value: 'WBRAID1' },
], 'GHL hidden fields use hh_gclid, gbraid and wbraid');
const accident = withGhlFormClickFields(ACCIDENT_FORM_URL, ids);
assert(accident.includes('hh_gclid=GCLID1'), 'accident form URL carries hh_gclid');
assert(accident.includes('gbraid=GBRAID1'), 'accident form URL carries gbraid');
assert(accident.includes('wbraid=WBRAID1'), 'accident form URL carries wbraid');
assert(accident.startsWith(ACCIDENT_FORM_URL), 'accident form path is unchanged');

console.log('clickTracking tests passed');
