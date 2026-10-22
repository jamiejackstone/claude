import { LOCATIONS } from '../constants.ts';
import { DayOfWeek } from '../types.ts';
import { activeTempVenueNotice, isBeforeLondonDate, londonDate, tempVenueEmbedSrc } from './venueNotice.ts';

function assert(condition: unknown, label: string): void {
  if (!condition) throw new Error(label);
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}\nactual:   ${a}\nexpected: ${b}`);
}

assertEqual(londonDate(new Date('2026-11-09T23:30:00Z')), '2026-11-09', '9 Nov 23:30 UTC is still 9 Nov in London');
assertEqual(londonDate(new Date('2026-11-10T00:00:00Z')), '2026-11-10', '10 Nov 00:00 UTC is 10 Nov in London');
// 24 Oct 2026 is still BST (UTC+1). 23:30 UTC is 00:30 the next calendar day in London.
assertEqual(londonDate(new Date('2026-10-24T23:30:00Z')), '2026-10-25', 'London date follows BST, not UTC');
assert(isBeforeLondonDate('2026-10-25', new Date('2026-10-24T22:30:00Z')), '22:30 UTC on 24 Oct is still 24 Oct in London');
assert(!isBeforeLondonDate('2026-10-25', new Date('2026-10-24T23:30:00Z')), '23:30 UTC on 24 Oct is already 25 Oct in London');

assertEqual(activeTempVenueNotice({}), null, 'missing notice is hidden');
assertEqual(activeTempVenueNotice({ tempVenueNotice: '   ' }), null, 'blank notice is hidden');
assertEqual(
  activeTempVenueNotice({ tempVenueNotice: 'Still here' }, new Date('2026-12-01T00:00:00Z')),
  'Still here',
  'a notice without an expiry stays visible',
);
assertEqual(
  activeTempVenueNotice(
    { tempVenueNotice: ' Move ', tempVenueNoticeUntil: '2026-11-10' },
    new Date('2026-11-09T23:30:00Z'),
  ),
  'Move',
  'notice is visible through the end of 9 Nov London time',
);
assertEqual(
  activeTempVenueNotice(
    { tempVenueNotice: 'Move', tempVenueNoticeUntil: '2026-11-10' },
    new Date('2026-11-10T00:00:00Z'),
  ),
  null,
  'notice is hidden from 10 Nov London time',
);

const aylesbury = LOCATIONS.find((location) => location.slug === 'aylesbury');
assert(aylesbury, 'Aylesbury location exists');
if (!aylesbury) throw new Error('Aylesbury location exists');

assertEqual(
  aylesbury.classes.map((session) => session.day),
  [DayOfWeek.MONDAY, DayOfWeek.MONDAY, DayOfWeek.MONDAY],
  'Aylesbury classes are Monday only',
);
assertEqual(aylesbury.displayDays, 'Mondays', 'Aylesbury display days stay Mondays');
assertEqual(
  aylesbury.address,
  'The Mandeville School, Ellen Road, Aylesbury HP21 8ED',
  'the usual Mandeville address stays in place',
);
assertEqual(aylesbury.mapQueryOverride, 'The Mandeville School, Aylesbury', 'the usual map query stays in place');
assertEqual(aylesbury.googleMapsUrl, undefined, 'the usual directions link is unchanged');
assertEqual(aylesbury.tempVenueParking, undefined, 'parking stays unset until Jamie confirms it');
assertEqual(aylesbury.tempVenueAccess, undefined, 'how to get in stays unset until Jamie confirms it');
assertEqual(aylesbury.tempVenueNoticeUntil, '2026-11-10', 'notice expires on 10 Nov 2026 London time');
assert(
  aylesbury.tempVenueNotice?.includes('Sir Henry Floyd Grammar School, Oxford Road, Aylesbury, HP21 8PE'),
  'notice uses the official Sir Henry Floyd address',
);
assert(
  aylesbury.tempVenueNotice?.startsWith('Venue change: Monday classes on 26 Oct, 2 Nov and 9 Nov'),
  'notice is limited to the Monday dates',
);
assert(
  aylesbury.tempVenueNotice?.includes(
    'starting 15 minutes later than usual: Rookies (Age 5-7) 17:45 (usually 17:30), Rising Stars (Age 8-11) 18:15 (usually 18:00)',
  ),
  'notice shows the confirmed start times and the age-group names from the class list',
);
assert(!aylesbury.tempVenueNotice?.includes('Ballers'), 'Ballers has no confirmed Floyd start time');
assert(!/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(aylesbury.tempVenueNotice ?? ''), 'notice shows start times only');
assertEqual(
  aylesbury.tempVenueMapsUrl,
  'https://www.google.com/maps/search/?api=1&query=Sir%20Henry%20Floyd%20Grammar%20School%20HP21%208PE',
  'temporary directions use the school name and postcode',
);
assertEqual(
  tempVenueEmbedSrc(aylesbury.tempVenueMapsUrl),
  'https://maps.google.com/maps?q=Sir%20Henry%20Floyd%20Grammar%20School%20HP21%208PE&t=&z=18&ie=UTF8&iwloc=&output=embed',
  'temporary map uses the same embed shape as the usual location map',
);
assertEqual(tempVenueEmbedSrc(undefined), null, 'no directions URL means no temporary map');
assertEqual(tempVenueEmbedSrc('not a url'), null, 'a bad directions URL does not render a map');
assertEqual(
  activeTempVenueNotice(aylesbury, new Date('2026-10-22T12:00:00Z')),
  aylesbury.tempVenueNotice,
  'notice is showing on 22 Oct 2026',
);
assertEqual(
  activeTempVenueNotice(aylesbury, new Date('2026-11-09T23:30:00Z')),
  aylesbury.tempVenueNotice,
  'notice is still showing on the evening of 9 Nov',
);
assertEqual(
  activeTempVenueNotice(aylesbury, new Date('2026-11-10T08:00:00Z')),
  null,
  'notice is gone on 10 Nov',
);
assert(
  LOCATIONS.filter((location) => location.slug !== 'aylesbury').every((location) => !location.tempVenueNotice),
  'no other location has a temporary venue notice',
);

console.log('venueNotice tests passed');
