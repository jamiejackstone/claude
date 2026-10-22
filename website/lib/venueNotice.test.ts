import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LOCATIONS } from '../constants.ts';
import { TemporaryVenueCard } from '../pages/LocationMicrosite.tsx';
import { DayOfWeek } from '../types.ts';
import {
  activeTemporaryVenues,
  directionsUrl,
  getActiveTemporaryVenues,
  getBookingWidgetUrl,
  isWithinLondonWindow,
  londonDate,
  mapEmbedSrc,
  temporaryVenueAnchorId,
  temporaryVenueHeading,
  temporaryVenueTimeLine,
  temporaryVenueUsualAside,
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
  ],
  'Aylesbury lists Rookies and Rising Stars only',
);
assert(!aylesbury.classes.some((session) => session.ageGroup.includes('Ballers')), 'Aylesbury has no Ballers class');
assertEqual(aylesbury.classes.every((session) => session.day === DayOfWeek.MONDAY), true, 'Aylesbury classes are Monday only');
assertEqual(
  aylesbury.address,
  'The Mandeville School, Ellen Road, Aylesbury HP21 8ED',
  'the usual Mandeville address stays in place',
);
assertEqual(aylesbury.mapQueryOverride, 'The Mandeville School, Aylesbury', 'the usual map query stays in place');
const baseWidgetUrl = 'https://goteamup.com/p/6822945-hoop-heroes/c/schedule?venues=48411,53172,50233,65944';
assertEqual(aylesbury.bookingWidgetUrl, baseWidgetUrl, 'the base TeamUp url is the original venue list');
assertEqual(floyd.teamupVenueIds, ['54994'], 'Sir Henry Floyd is added only from the temporary venue');
assertEqual(
  getBookingWidgetUrl(aylesbury, new Date('2026-10-26T12:00:00Z')),
  `${baseWidgetUrl},54994`,
  '26 Oct includes Sir Henry Floyd 54994',
);
assertEqual(
  getBookingWidgetUrl(aylesbury, new Date('2026-11-09T23:30:00Z')),
  `${baseWidgetUrl},54994`,
  'the evening of 9 Nov still includes Sir Henry Floyd',
);
assertEqual(
  getActiveTemporaryVenues(aylesbury, new Date('2026-11-10T08:00:00Z')),
  [],
  'no temporary entries are active on 10 Nov',
);
assertEqual(
  getBookingWidgetUrl(aylesbury, new Date('2026-11-10T08:00:00Z')),
  baseWidgetUrl,
  '10 Nov uses the original base widget url',
);
assertEqual(
  getBookingWidgetUrl({
    bookingWidgetUrl: 'https://goteamup.com/p/x/c/schedule?venues=1,54994',
    temporaryVenues: [{ ...sample, teamupVenueIds: ['54994', '2'] }],
  }, new Date('2026-10-26T12:00:00Z')),
  'https://goteamup.com/p/x/c/schedule?venues=1,54994,2',
  'temporary venue ids are appended once',
);
const floydAddress = 'Sir Henry Floyd Grammar School, Oxford Road, Aylesbury HP21 8PE';
assertEqual(floyd.venueName, 'Sir Henry Floyd Grammar School Sports Hall', 'venue name is the sports hall');
assertEqual(floyd.address, floydAddress, 'address is the member-email address');
assertEqual(floyd.mapQuery, floydAddress, 'map query uses the same address');
assertEqual(floyd.showFrom, '2026-10-22', 'window starts on 22 Oct 2026');
assertEqual(floyd.showUntil, '2026-11-09', 'window ends on 9 Nov 2026 inclusive');
assertEqual(
  floyd.sessionDates,
  ['Monday 26 October', 'Monday 2 November', 'Monday 9 November'],
  'session dates use the full day and month',
);
assertEqual(
  temporaryVenueHeading(floyd.sessionDates),
  'TEMPORARY VENUE: Monday 26 October, Monday 2 November, Monday 9 November',
  'heading is the label plus the configured dates',
);
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
assertEqual(
  floyd.parking,
  'Please park in the college car park next to the school. It is clearly signposted.',
  'parking is the college car park note',
);
assertEqual(
  floyd.entry,
  'Come in through the lettings entrance by the Gym. The Sports Hall is a short walk from there.',
  'entry is the lettings entrance note',
);
assertEqual(floyd.siteMapImage, {
  src: '/images/sir-henry-floyd-lettings-map.jpg',
  alt: 'Site map showing parking, the lettings entrance, the Gym and the Sports Hall at Sir Henry Floyd',
}, 'site map image is set');
assert(JSON.stringify(floyd).includes('Please park in the college car park next to the school. It is clearly signposted.'), 'parking text is published');
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
assertEqual(
  floyd.times.map((slot) => temporaryVenueUsualAside(slot.time, slot.usualTime)),
  ['(usually 17:30)', '(usually 18:00)'],
  'a changed time still shows the usual start time',
);
assert(
  LOCATIONS.filter((location) => location.slug !== 'aylesbury' && location.slug !== 'holmer-green').every((location) => !location.temporaryVenues?.length),
  'only Aylesbury and Holmer Green have temporary venues',
);

const holmer = LOCATIONS.find((location) => location.slug === 'holmer-green');
assert(holmer, 'Holmer Green location exists');
if (!holmer) throw new Error('Holmer Green location exists');

const ramsay = holmer.temporaryVenues?.[0];
assert(ramsay, 'Holmer Green has a temporary venue');
if (!ramsay) throw new Error('Holmer Green has a temporary venue');

assertEqual(
  holmer.classes.map((session) => `${session.day} ${session.time} ${session.ageGroup}`),
  [
    'Tuesday 17:00 - 17:30 Rookies (Age 5-7)',
    'Tuesday 17:30 - 18:15 Rising Stars (Age 8-11)',
    'Tuesday 18:15 - 19:00 Ballers (Age 12-15)',
  ],
  'Holmer Green class times keep Rising Stars and Ballers and move Rookies earlier',
);
const holmerBaseWidgetUrl = 'https://goteamup.com/p/6822945-hoop-heroes/c/schedule?venues=48474,48651';
assertEqual(holmer.bookingWidgetUrl, holmerBaseWidgetUrl, 'the base TeamUp url already lists both Holmer Green venues');
assert(holmerBaseWidgetUrl.includes('48474'), '48474 is Holmer Green Senior School');
assert(holmerBaseWidgetUrl.includes('48651'), '48651 is already on the base Holmer Green filter');
assertEqual(ramsay.teamupVenueIds, ['48651'], 'Sir William Ramsay is listed on the temporary venue');
assertEqual(ramsay.venueName, 'Sir William Ramsay School', 'venue name uses the Ramsay spelling');
const ramsayAddress = 'Sir William Ramsay School, Rose Avenue, Hazlemere, High Wycombe, Buckinghamshire, HP15 7UB';
assertEqual(ramsay.address, ramsayAddress, 'address is the school contact-page address');
assertEqual(ramsay.mapQuery, ramsayAddress, 'map query uses the same address');
assertEqual(ramsay.showFrom, '2026-10-22', 'Holmer Green preview window starts on 22 Oct 2026');
assertEqual(ramsay.showUntil, '2026-11-24', 'Holmer Green window ends on 24 Nov 2026 inclusive');
assertEqual(
  ramsay.sessionDates,
  ['Tuesday 17 November', 'Tuesday 24 November'],
  'session dates are the two November Tuesdays',
);
assertEqual(ramsay.timesNote, 'Same times as usual', 'times note does not say the sessions start later');
assertEqual(ramsay.times, [
  { label: 'Rookies (Age 5-7)', time: '17:00 - 17:30', usualTime: '17:00 - 17:30' },
  { label: 'Rising Stars (Age 8-11)', time: '17:30 - 18:15', usualTime: '17:30 - 18:15' },
  { label: 'Ballers (Age 12-15)', time: '18:15 - 19:00', usualTime: '18:15 - 19:00' },
], 'temporary times match the usual Tuesday classes');
assertEqual(
  ramsay.times.map((slot) => temporaryVenueTimeLine(slot)),
  [
    'Rookies (Age 5-7) 17:00 - 17:30',
    'Rising Stars (Age 8-11) 17:30 - 18:15',
    'Ballers (Age 12-15) 18:15 - 19:00',
  ],
  'unchanged times render with no usually text',
);
assertEqual(
  ramsay.times.map((slot) => temporaryVenueUsualAside(slot.time, slot.usualTime)),
  [null, null, null],
  'an unchanged time has no usually aside',
);
assertEqual(temporaryVenueUsualAside('17:00 - 17:30', '17:00-17:30'), null, 'dash spacing does not count as a time change');
assertEqual(ramsay.returnNote, 'Back at Holmer Green Senior School from Tue 1 Dec', 'return note is set');
assertEqual(
  ramsay.tickerText,
  'Temporary venue on Tue 17 and 24 Nov: Sir William Ramsay School - see details',
  'ticker text is set',
);
assertEqual(ramsay.parking, undefined, 'parking is still to come');
assertEqual(ramsay.entry, undefined, 'entry is still to come');
assertEqual(ramsay.siteMapImage, undefined, 'no site map image');
const ramsayHtml = renderToStaticMarkup(React.createElement(TemporaryVenueCard, { venue: ramsay, anchorId: 'temporary-venue' }));
assert(!ramsayHtml.includes('usually'), 'the rendered card does not say usually when times are unchanged');
assert(ramsayHtml.includes('Same times as usual'), 'the rendered card says the times are the same as usual');
assert(ramsayHtml.includes('Rookies (Age 5-7) 17:00 - 17:30'), 'the rendered Rookies time is unchanged');
assert(ramsayHtml.includes('Rising Stars (Age 8-11) 17:30 - 18:15'), 'the rendered Rising Stars time is unchanged');
assert(ramsayHtml.includes('Ballers (Age 12-15) 18:15 - 19:00'), 'the rendered Ballers time is unchanged');
assert(!ramsayHtml.includes('>Parking<') && !ramsayHtml.includes('How to get in'), 'parking and entry stay off the card');
assert(!ramsayHtml.includes('<img'), 'the card has no site map image');
const floydHtml = renderToStaticMarkup(React.createElement(TemporaryVenueCard, { venue: floyd, anchorId: 'temporary-venue' }));
assert(floydHtml.includes('(usually 17:30)'), 'a changed Rookies time still renders the usual aside');
assert(floydHtml.includes('(usually 18:00)'), 'a changed Rising Stars time still renders the usual aside');
assert(!JSON.stringify(holmer).includes('Ramsey'), 'Holmer Green copy uses Ramsay');
assert(!JSON.stringify(LOCATIONS).includes('Ramsey'), 'no location still spells the school Ramsey');
assertEqual(
  getActiveTemporaryVenues(holmer, new Date('2026-10-26T12:00:00Z')).map((venue) => venue.venueName),
  ['Sir William Ramsay School'],
  'Holmer Green preview window is already open on 26 Oct',
);
assertEqual(
  getBookingWidgetUrl(holmer, new Date('2026-10-26T12:00:00Z')),
  holmerBaseWidgetUrl,
  '26 Oct keeps the base widget url',
);
assertEqual(
  activeTemporaryVenues(holmer.temporaryVenues, new Date('2026-10-27T00:30:00Z')).map((venue) => venue.venueName),
  ['Sir William Ramsay School'],
  'Holmer Green venue appears from 27 Oct',
);
assertEqual(
  activeTemporaryVenues(holmer.temporaryVenues, new Date('2026-11-17T12:00:00Z')).length,
  1,
  'Holmer Green venue is showing on 17 Nov',
);
assertEqual(
  getBookingWidgetUrl(holmer, new Date('2026-11-17T12:00:00Z')),
  holmerBaseWidgetUrl,
  '17 Nov does not duplicate venue 48651',
);
assert(
  !String(getBookingWidgetUrl(holmer, new Date('2026-11-17T12:00:00Z'))).includes('48651,48651'),
  'the venues query does not repeat 48651',
);
assertEqual(
  activeTemporaryVenues(holmer.temporaryVenues, new Date('2026-11-24T23:30:00Z')).length,
  1,
  'Holmer Green venue is showing through the evening of 24 Nov',
);
assertEqual(
  getActiveTemporaryVenues(holmer, new Date('2026-11-25T12:00:00Z')),
  [],
  'Holmer Green venue is hidden on 25 Nov',
);
assertEqual(
  getBookingWidgetUrl(holmer, new Date('2026-11-25T12:00:00Z')),
  holmerBaseWidgetUrl,
  '25 Nov uses the original base widget url',
);

console.log('venueNotice tests passed');
