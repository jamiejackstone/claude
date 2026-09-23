import {
  buildGoDestination,
  clickIdFields,
  clickIdsFromRecord,
  ghlCustomFieldEntries,
  ghlV1CustomField,
  mergeIncomingSearch,
  pickTrackedParams,
  withTrackedParams,
} from './clickTracking.ts';

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

const entries = ghlCustomFieldEntries({ gclid: 'TEST_HH_20260923', gbraid: 'GB', wbraid: 'WB' });
assertEqual(entries, [
  { id: '9frYn0xCQ45lkz4R6q0e', key: 'hh_gclid', fieldValue: 'TEST_HH_20260923' },
  { id: 'Vco6cxY4VKBWQ9FPB6rQ', key: 'gbraid', fieldValue: 'GB' },
  { id: 'fMkXv33gXAGUuHBDcber', key: 'wbraid', fieldValue: 'WB' },
], 'customFields use hh_gclid for the landing gclid');

const v1 = ghlV1CustomField({ gclid: 'TEST_HH_20260923', wbraid: 'WB' });
assertEqual(v1, {
  '9frYn0xCQ45lkz4R6q0e': 'TEST_HH_20260923',
  'fMkXv33gXAGUuHBDcber': 'WB',
}, 'v1 customField is keyed by field id');
assertEqual(ghlV1CustomField({}), undefined, 'no click ids means no customField');
assert(!JSON.stringify(entries).includes('contact.gclid'), 'native contact.gclid is not sent');

assertEqual(clickIdFields({ gclid: 'TEST', utm_source: 'google' }), { gclid: 'TEST' }, 'lead payload is click ids only');
assertEqual(clickIdsFromRecord({ gclid: ' TEST ', gbraid: 1, wbraid: '' }), { gclid: 'TEST' }, 'non-strings and blanks are dropped');

console.log('clickTracking tests passed');
