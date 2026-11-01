import { LOCATIONS } from '../constants.ts';
import { DayOfWeek } from '../types.ts';
import { buildLocationJsonLd } from './locationSchema.ts';

function assert(condition: unknown, label: string): void {
  if (!condition) throw new Error(label);
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}\nactual:   ${a}\nexpected: ${b}`);
}

const sandhurst = LOCATIONS.find((location) => location.slug === 'sandhurst');
assert(sandhurst, 'Sandhurst location exists');
if (!sandhurst) throw new Error('Sandhurst location exists');

const wendover = LOCATIONS.find((location) => location.slug === 'wendover');
assert(wendover, 'Wendover location exists');
if (!wendover) throw new Error('Wendover location exists');

assertEqual(sandhurst.name, 'Sandhurst Sports Centre (at Sandhurst School)', 'venue name is the sports centre');
assertEqual(sandhurst.address, 'Owlsmoor Road, Sandhurst, Berkshire GU47 0SD', 'displayed address drops the school prefix');
assertEqual(sandhurst.postalAddress, {
  streetAddress: 'Owlsmoor Road',
  addressLocality: 'Sandhurst',
  addressRegion: 'Berkshire',
  postalCode: 'GU47 0SD',
  addressCountry: 'GB',
}, 'structured address is stored on the location');
assertEqual(sandhurst.coordinates, { lat: 51.34978, lng: -0.78205 }, 'coordinates are the sports centre car park');
assertEqual(
  sandhurst.mapQueryOverride,
  '51.34978,-0.78205',
  'map embed override uses the same field as John Colet and pins the car park',
);
assertEqual(
  wendover.mapQueryOverride,
  'John Colet School, Wharf Road, Wendover HP22 6HF',
  'John Colet map override stays in place',
);
assertEqual(
  sandhurst.locationNotes,
  "We run in the sports hall at Sandhurst School, Owlsmoor Road, Sandhurst, GU47 0SD. On site it's signposted Sandhurst Sports Centre – follow those signs, not the school ones.\n\nDon't go to the main school entrance or reception – it's closed on Sundays and there's no way through to the hall from there. Coming along Owlsmoor Road, the turning for the sports hall is on your right, just before the main school entrance. Follow the Sports Centre signs into the car park; the hall entrance is right there.\n\nParking is free and plentiful. Please arrive a few minutes early so your child can sign in with the coach before the session starts.",
  'arrival directions stay word for word',
);
assertEqual(sandhurst.bookingWidgetUrl, 'https://goteamup.com/p/6822945-hoop-heroes/c/schedule?venues=66611', 'TeamUp venue id stays 66611');
assertEqual(sandhurst.ghlTag, 'Sandhurst Earlybird', 'CRM tag stays the same');
assertEqual(
  sandhurst.classes.map((session) => `${session.day} ${session.time} ${session.ageGroup} ${session.comingSoon ? 'soon' : 'live'}`),
  [
    'Sunday 15:00 - 15:30 Rookies (Age 5-7) live',
    'Sunday 15:30 - 16:15 Rising Stars (Age 8-11) live',
    'Sunday  Ballers (Age 12-15) soon',
  ],
  'Sandhurst class times stay the same',
);
assertEqual(sandhurst.classes[0]?.day, DayOfWeek.SUNDAY, 'Sandhurst still runs on Sunday');

assertEqual(
  LOCATIONS.filter((location) => location.slug !== 'sandhurst').map((location) => location.name),
  ['Bicester', 'Marlow', 'Holmer Green', 'Wendover', 'Tring', 'Aylesbury', 'Great Missenden', 'Oxford'],
  'other location names stay the same',
);

const jsonLd = buildLocationJsonLd(sandhurst);
assert(jsonLd, 'Sandhurst JSON-LD is emitted');
if (!jsonLd) throw new Error('Sandhurst JSON-LD is emitted');

assertEqual(jsonLd['@type'], 'SportsActivityLocation', 'schema type stays a local business location');
assertEqual(jsonLd.name, 'Sandhurst Sports Centre (at Sandhurst School)', 'schema name is the sports centre');
assertEqual(jsonLd.address, {
  '@type': 'PostalAddress',
  streetAddress: 'Owlsmoor Road',
  addressLocality: 'Sandhurst',
  addressRegion: 'Berkshire',
  postalCode: 'GU47 0SD',
  addressCountry: 'GB',
}, 'schema address is structured');
assertEqual(jsonLd.geo, {
  '@type': 'GeoCoordinates',
  latitude: 51.34978,
  longitude: -0.78205,
}, 'schema geo is the car park');
assertEqual(jsonLd.description, 'Youth basketball classes for ages 5-11 in Sandhurst.', 'schema description still names the town');

const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(sandhurst.mapQueryOverride || `Hoop Heroes ${sandhurst.name}`)}&t=&z=18&ie=UTF8&iwloc=&output=embed`;
assertEqual(
  mapSrc,
  'https://maps.google.com/maps?q=51.34978%2C-0.78205&t=&z=18&ie=UTF8&iwloc=&output=embed',
  'the location map iframe queries the car park coordinates',
);
assert(!mapSrc.includes('Sandhurst%20School'), 'the map query does not search for the school');
