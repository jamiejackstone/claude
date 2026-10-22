import { LOCATIONS } from '../constants.ts';
import { DayOfWeek } from '../types.ts';
import {
  activeTemporaryVenues,
  directionsUrl,
  isWithinLondonWindow,
  londonDate,
  mapEmbedSrc,
  temporaryVenueAnchorId,
} from './venueNotice.ts';

function assert(condition: unknown, label: string): void {
  if (!condition) throw new Error(label);
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}\nactual:   ${a}\nexpected: ${b}`);
}

const dateWindow = { showFrom: '2026-10-22', showUntil: '2026-11-09' };

assertEqual(londonDate(new Date('2026-11-09T23:30:00Z')), '2026-11-09', '9 Nov 23:30 UTC is still 9 Nov in London');
assertEqual(londonDate(new Date('2026-11-10T00:00:00Z')), '2026-11-10', '10 Nov 00:00 UTC is 10 Nov in London');
assertEqual(londonDate(new Date('2026-10-21T23:30:00Z')), '2026-10-22', '21 Oct 23:30 UTC is already 22 Oct in London');
assertEqual(londonDate(new Date('2026-10-21T22:00:00Z')), '2026-10-21', '21 Oct 22:00 UTC is still 21 Oct in London');

assert(isWithinLondonWindow(dateWindow.showFrom, dateWindow.showUntil, new Date('2026-10-22T12:00:00Z')), 'shown on the first day');
assert(isWithinLondonWindow(dateWindow.showFrom, dateWindow.showUntil, new Date('2026-11-09T23:30:00Z')), 'shown through the end of the last day');
assert(isWithinLondonWindow(dateWindow.showFrom, dateWindow.showUntil, new Date('2026-10-21T23:30:00Z')), 'shown when London has already reached the start date');
assert(!isWithinLondonWindow(dateWindow.showFrom, dateWindow.showUntil, new Date('2026-10-21T22:00:00Z')), 'hidden the London day before showFrom');
assert(!isWithinLondonWindow(dateWindow.showFrom, dateWindow.showUntil, new Date('2026-11-10T00:00:00Z')), 'hidden the London day after showUntil');

const sample = {
  venueName: 'Example',
  address: '1 Road',
  mapQuery: 'Example School AB1 2CD',
  showFrom: '2026-10-22',
  showUntil: '2026-11-09',
  sessionDates: ['Mon 26 Oct'],
  timesNote: 'Starting 15 minutes later than usual',
  times: [{ label: 'Rookies (Age 5-7)', time: '17:45', usualTime: '17:30' }],
  returnNote: 'Back soon',
  tickerText: 'Temporary venue',
};

assertEqual(activeTemporaryVenues(undefined), [], 'missing venues stay hidden');
assertEqual(activeTemporaryVenues([]), [], 'an empty list stays hidden');
assertEqual(
  activeTemporaryVenues([sample], new Date('2026-10-22T08:00:00Z')).map((venue) => venue.venueName),
  ['Example'],
  'a venue inside the window is shown',
);
assertEqual(
  activeTemporaryVenues([sample], new Date('2026-11-10T08:00:00Z')),
  [],
  'a venue after the window is hidden',
);
assertEqual(temporaryVenueAnchorId(0), 'temporary-venue', 'the first venue uses the shared anchor');
assertEqual(temporaryVenueAnchorId(1), 'temporary-venue-2', 'later venues get their own anchor');
assertEqual(mapEmbedSrc('  '), null, 'a blank map query does not render a map');
assertEqual(directionsUrl(undefined), null, 'a missing map query does not render directions');

const aylesbury = LOCATIONS.find((location) => location.slug === 'aylesbury');
assert(aylesbury, 'Aylesbury location exists');
if (!aylesbury) throw new Error('Aylesbury location exists');

const floyd = aylesbury.temporaryVenues?.[0];
assert(floyd, 'Aylesbury has a temporary venue');
if (!floyd) throw new Error('Aylesbury has a temporary venue');

assertEqual(
  aylesbury.classes.map((session) => `${session.day} ${session.time} ${session.ageGroup}`),
  [
    'Monday 17:30 - 18:15 Rookies (Age 5-7)',
    'Monday 17:30 - 18:15 Rising Stars (Age 8-11)',
    'Monday 18:15 - 19:00 Ballers (Age 12-15)',
  ],
  'the usual Aylesbury class list is unchanged',
);
assertEqual(aylesbury.classes.every((session) => session.day === DayOfWeek.MONDAY), true, 'Aylesbury classes are Monday only');
assertEqual(
  aylesbury.address,
  'The Mandeville School, Ellen Road, Aylesbury HP21 8ED',
  'the usual Mandeville address stays in place',
);
assertEqual(aylesbury.mapQueryOverride, 'The Mandeville School, Aylesbury', 'the usual map query stays in place');
const floydAddress = 'Sir Henry Floyd Grammar School, Oxford Road, Aylesbury HP21 8PE';
assertEqual(floyd.venueName, 'Sir Henry Floyd Grammar School (Sports Hall)', 'venue name includes the sports hall');
assertEqual(floyd.address, floydAddress, 'address is the member-email address');
assertEqual(floyd.mapQuery, floydAddress, 'map query uses the same address');
assertEqual(floyd.showFrom, '2026-10-22', 'window starts on 22 Oct 2026');
assertEqual(floyd.showUntil, '2026-11-09', 'window ends on 9 Nov 2026 inclusive');
assertEqual(floyd.sessionDates, ['Mon 26 Oct', 'Mon 2 Nov', 'Mon 9 Nov'], 'session dates are the three Mondays');
assertEqual(floyd.timesNote, 'Starting 15 minutes later than usual', 'times note is set');
assertEqual(floyd.times, [
  { label: 'Rookies (Age 5-7)', time: '17:45', usualTime: '17:30' },
  { label: 'Rising Stars (Age 8-11)', time: '18:15', usualTime: '18:00' },
], 'start times use the class-list age-group names');
assertEqual(floyd.returnNote, 'Back at The Mandeville School from Mon 16 Nov', 'return note is set');
assertEqual(
  floyd.tickerText,
  'Temporary venue for the next 3 weeks: Sir Henry Floyd, new times - see details',
  'ticker text is set',
);
assertEqual(floyd.parking, undefined, 'parking stays unset');
assertEqual(
  floyd.entry,
  'Come in through the lettings entrance by the Gym. The Sports Hall is a short walk from there.',
  'entry is the lettings entrance note',
);
assertEqual(floyd.siteMapImage, {
  src: '/images/sir-henry-floyd-lettings-map.jpg',
  alt: 'Site map showing parking, the lettings entrance, the Gym and the Sports Hall at Sir Henry Floyd',
}, 'site map image is set');
assert(!JSON.stringify(floyd).includes('Please park in the college'), 'parking text is not published');
assert(!JSON.stringify(floyd).includes('Ballers'), 'Ballers has no confirmed Floyd time');
assertEqual(
  mapEmbedSrc(floyd.mapQuery),
  `https://maps.google.com/maps?q=${encodeURIComponent(floydAddress)}&t=&z=18&ie=UTF8&iwloc=&output=embed`,
  'temporary map uses the usual embed shape',
);
assertEqual(
  directionsUrl(floyd.mapQuery),
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(floydAddress)}`,
  'directions use the member-email address',
);
assertEqual(
  activeTemporaryVenues(aylesbury.temporaryVenues, new Date('2026-10-22T12:00:00Z')).length,
  1,
  'Aylesbury venue is showing on 22 Oct',
);
assertEqual(
  activeTemporaryVenues(aylesbury.temporaryVenues, new Date('2026-11-09T23:30:00Z')).length,
  1,
  'Aylesbury venue is showing on the evening of 9 Nov',
);
assertEqual(
  activeTemporaryVenues(aylesbury.temporaryVenues, new Date('2026-11-10T08:00:00Z')).length,
  0,
  'Aylesbury venue is hidden on 10 Nov',
);
assert(
  LOCATIONS.filter((location) => location.slug !== 'aylesbury').every((location) => !location.temporaryVenues?.length),
  'no other location has a temporary venue',
);

console.log('venueNotice tests passed');
