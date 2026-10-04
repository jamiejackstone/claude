import { withTrackedParams } from './clickTracking.ts';
import {
  GAMEDAY_EVENT,
  GAMEDAY_META_DESCRIPTION,
  GAMEDAY_PAGE_TITLE,
  GAMEDAY_REGISTRATION_URL,
  buildGamedayJsonLd,
} from './gamedayEvent.ts';

function assert(condition: unknown, label: string): void {
  if (!condition) throw new Error(label);
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}\nactual:   ${a}\nexpected: ${b}`);
}

const schema = buildGamedayJsonLd();
const offers = schema.offers as { price: string; priceCurrency: string; url: string; validThrough: string };
const location = schema.location as {
  name: string;
  address: { streetAddress: string; addressLocality: string; postalCode: string; addressCountry: string };
};

assertEqual(schema['@type'], 'SportsEvent', 'event type');
assertEqual(schema.name, 'Oxford 3v3 Game Day', 'event name');
assertEqual(schema.startDate, '2026-10-25T09:00:00+00:00', 'start is 09:00 GMT after the clocks change');
assertEqual(schema.endDate, '2026-10-25T12:00:00+00:00', 'end is 12:00 GMT');
assertEqual(location.name, 'The Oxford Academy sports hall', 'venue name');
assertEqual(location.address.streetAddress, 'Sandy Lane West', 'street');
assertEqual(location.address.addressLocality, 'Oxford', 'locality');
assertEqual(location.address.postalCode, 'OX4 6JZ', 'postcode');
assertEqual(location.address.addressCountry, 'GB', 'country');
assertEqual(offers.price, '30', 'price');
assertEqual(offers.priceCurrency, 'GBP', 'currency');
assertEqual(offers.url, GAMEDAY_REGISTRATION_URL, 'offer URL is the booking link');
assertEqual(offers.validThrough, '2026-10-18', 'offer valid through registration close');
assertEqual(schema.typicalAgeRange, '8-15', 'ages');
assert(GAMEDAY_PAGE_TITLE.includes('Oxford 3v3 Game Day'), 'title names the event');
assert(GAMEDAY_META_DESCRIPTION.includes('25 October 2026'), 'description names the date');
assert(GAMEDAY_META_DESCRIPTION.includes('£30'), 'description shows the pound price');
const retiredCourseId = '131' + '282';
assert(!JSON.stringify(schema).includes(retiredCourseId), 'schema has no old course id');
assert(!JSON.stringify(schema).includes('April'), 'schema has no April copy');
assert(!JSON.stringify(schema).includes('Wendover'), 'schema has no Wendover venue');
assert(GAMEDAY_EVENT.registrationUrl.endsWith('/courses/139859/'), 'registration URL is course 139859');
assert(GAMEDAY_EVENT.clocksNote.includes('1am'), 'clocks note is present');
assert(GAMEDAY_EVENT.halfTermNote.toLowerCase().includes('half term'), 'half term note is present');

const tracked = withTrackedParams(GAMEDAY_REGISTRATION_URL, {
  gclid: 'TEST_HH_20260923',
  gbraid: 'GB',
  wbraid: 'WB',
});
assert(tracked.startsWith(`${GAMEDAY_REGISTRATION_URL}?`), 'course path and trailing slash stay put');
assert(new URL(tracked).searchParams.get('gclid') === 'TEST_HH_20260923', 'gclid is appended');
assert(new URL(tracked).searchParams.get('gbraid') === 'GB', 'gbraid is appended');
assert(new URL(tracked).searchParams.get('wbraid') === 'WB', 'wbraid is appended');
assert(!tracked.includes('139859/139859'), 'course id is not duplicated');
assert(!tracked.includes(retiredCourseId), 'tracked link has no old course id');

console.log('gamedayEvent tests passed');
