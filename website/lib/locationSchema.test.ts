import { LOCATIONS } from '../constants.ts';
import { DayOfWeek } from '../types.ts';
import {
  HOME_DOCUMENT_TITLE,
  ORG_ID,
  buildLocationJsonLd,
  buildOrganizationJsonLd,
  jsonLdScriptTag,
  locationDocumentTitle,
  locationH1Text,
} from './locationSchema.ts';

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
  streetAddress: 'Sandhurst Sports Centre, Owlsmoor Road',
  addressLocality: 'Sandhurst',
  addressRegion: 'Berkshire',
  postalCode: 'GU47 0SD',
  addressCountry: 'GB',
}, 'schema address is the permanent venue, with the county kept from the stored postal address');
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

assertEqual(jsonLd['@id'], 'https://www.hoopheroes.co.uk/location/sandhurst#location', 'location @id');
assertEqual(jsonLd.url, 'https://www.hoopheroes.co.uk/location/sandhurst', 'location url');
assertEqual(jsonLd.parentOrganization, { '@id': 'https://www.hoopheroes.co.uk/#org' }, 'parent organization');
assertEqual(jsonLd.telephone, '+447700140500', 'location telephone');
assertEqual(jsonLd.hasMap, 'https://maps.google.com/maps?cid=3792785733511503984', 'Sandhurst hasMap is the GBP url');
assertEqual(jsonLd.audience, {
  '@type': 'PeopleAudience',
  suggestedMinAge: 5,
  suggestedMaxAge: 15,
}, 'audience is ages 5 to 15');
assertEqual(jsonLd.openingHoursSpecification, [{
  '@type': 'OpeningHoursSpecification',
  dayOfWeek: 'https://schema.org/Sunday',
  opens: '15:00',
  closes: '16:15',
}], 'Sandhurst hours stay the bookable Sunday span');
assert(!('sameAs' in jsonLd), 'no sameAs on Sandhurst');
assert(!('aggregateRating' in jsonLd), 'no aggregateRating on Sandhurst');
assert(!JSON.stringify(jsonLd).includes('Sir Henry Floyd'), 'Sandhurst schema is not a temporary venue');

assertEqual(locationDocumentTitle(sandhurst), 'Kids Basketball Classes in Sandhurst (Ages 5-11) | Hoop Heroes', 'Sandhurst title stays the worker title');
assertEqual(locationH1Text(sandhurst), 'Kids Basketball Classes in Sandhurst', 'Sandhurst H1 uses the town');

for (const location of LOCATIONS) {
  const title = locationDocumentTitle(location);
  const h1 = locationH1Text(location);
  assert(!title.includes(' Basketball Classes | Hoop Heroes'), `${location.slug} title is not the short rewrite`);
  if (location.slug === 'sandhurst') {
    assertEqual(title, 'Kids Basketball Classes in Sandhurst (Ages 5-11) | Hoop Heroes', 'sandhurst document title');
  } else {
    assertEqual(title, `Kids Basketball Classes in ${location.name} | Hoop Heroes`, `${location.slug} document title`);
  }
  assertEqual(h1, `Kids Basketball Classes in ${location.slug === 'sandhurst' ? 'Sandhurst' : location.name}`, `${location.slug} H1`);
  assert(!title.includes(`${location.name} Basketball Classes |`), `${location.slug} title is not rewritten`);

  const linked = buildLocationJsonLd(location);
  assert(linked, `${location.slug} schema`);
  if (!linked) continue;
  if (location.schemaAddressHold) {
    assert(!('address' in linked), `${location.slug} address is held out of JSON-LD`);
    assert(!JSON.stringify(linked).includes('PostalAddress'), `${location.slug} emits no PostalAddress`);
    assert(!JSON.stringify(linked).includes(location.schemaAddress.postalCode), `${location.slug} schema omits the held postcode`);
  } else {
    const address = linked.address as { streetAddress?: string; postalCode?: string; addressCountry?: string };
    assert(address.streetAddress, `${location.slug} street address`);
    assertEqual(address.addressCountry, 'GB', `${location.slug} country`);
  }
  assert(linked.geo, `${location.slug} geo`);
  assert(linked.openingHoursSpecification, `${location.slug} opening hours`);
  assert(linked.hasMap, `${location.slug} hasMap`);
  assertEqual(linked['@id'], `https://www.hoopheroes.co.uk/location/${location.slug}#location`, `${location.slug} @id`);
  assert(!('sameAs' in linked), `${location.slug} sameAs omitted`);
  assert(!('aggregateRating' in linked), `${location.slug} aggregateRating omitted`);
  assert(!JSON.stringify(linked).includes('temporaryVenues'), `${location.slug} schema ignores temporary venue objects`);
}

const marlow = LOCATIONS.find((location) => location.slug === 'marlow');
const bicester = LOCATIONS.find((location) => location.slug === 'bicester');
assert(marlow && bicester, 'Marlow and Bicester exist');
if (marlow && bicester) {
  assertEqual(marlow.address, 'Redgrave Sports Centre, Wycombe Road, Marlow SL7 1JE', 'visible Marlow address stays SL7 1JE');
  assertEqual(marlow.schemaAddress.postalCode, 'SL7 3JD', 'Marlow GBP postcode stays stored');
  assert(marlow.schemaAddressHold, 'Marlow schema address is on hold');
  const marlowLd = buildLocationJsonLd(marlow);
  assert(marlowLd, 'Marlow schema');
  if (marlowLd) {
    assert(!('address' in marlowLd), 'Marlow JSON-LD has no address');
    assertEqual(marlowLd.name, 'Marlow', 'Marlow name stays');
    assertEqual(marlowLd.url, 'https://www.hoopheroes.co.uk/location/marlow', 'Marlow url stays');
    assertEqual(marlowLd.geo, { '@type': 'GeoCoordinates', latitude: 51.5811113, longitude: -0.7662396 }, 'Marlow geo stays');
    assertEqual(marlowLd.hasMap, 'https://maps.google.com/maps?cid=12972546026606672369', 'Marlow hasMap stays');
    assertEqual(marlowLd.telephone, '+447700140500', 'Marlow telephone stays');
    assertEqual(marlowLd.parentOrganization, { '@id': 'https://www.hoopheroes.co.uk/#org' }, 'Marlow parent stays');
    assertEqual(marlowLd.audience, { '@type': 'PeopleAudience', suggestedMinAge: 5, suggestedMaxAge: 15 }, 'Marlow audience stays');
    assert(marlowLd.openingHoursSpecification, 'Marlow hours stay');
    assert(!JSON.stringify(marlowLd).includes('SL7 3JD'), 'held GBP postcode is absent from Marlow JSON-LD');
    assert(!JSON.stringify(marlowLd).includes('SL7 1JE'), 'visible postcode is absent from Marlow JSON-LD');
  }
  assertEqual(bicester.mapsUrl, 'https://maps.google.com/maps?cid=825875848591025387', 'Bicester hasMap url is the GBP cid');
  assertEqual(buildLocationJsonLd(bicester)?.hasMap, 'https://maps.google.com/maps?cid=825875848591025387', 'Bicester schema hasMap is unchanged');
}

const aylesbury = LOCATIONS.find((location) => location.slug === 'aylesbury');
const holmer = LOCATIONS.find((location) => location.slug === 'holmer-green');
assert(aylesbury && holmer, 'permanent venues exist');
if (aylesbury && holmer) {
  assertEqual(aylesbury.address, 'The Mandeville School, Ellen Road, Aylesbury HP21 8ED', 'visible Aylesbury address stays the stored line');
  assertEqual(holmer.address, 'Holmer Green Senior School, HP15 6SP', 'visible Holmer Green address stays the stored line');
  const aylesburyLd = buildLocationJsonLd(aylesbury);
  const holmerLd = buildLocationJsonLd(holmer);
  assert(aylesburyLd && holmerLd, 'temporary-venue locations still emit schema');
  if (aylesburyLd && holmerLd) {
    assertEqual(aylesburyLd.address, {
      '@type': 'PostalAddress',
      streetAddress: 'Ellen Road',
      addressLocality: 'Aylesbury',
      postalCode: 'HP21 8ES',
      addressCountry: 'GB',
    }, 'Aylesbury schema uses the permanent GBP address');
    assertEqual((aylesburyLd.geo as { latitude: number }).latitude, 51.7989776, 'Aylesbury schema geo is the GBP pin');
    assert(!JSON.stringify(aylesburyLd).includes('Sir Henry Floyd'), 'Aylesbury schema skips the temporary venue');
    assert(!JSON.stringify(aylesburyLd).includes('HP21 8PE'), 'Aylesbury schema skips the temporary postcode');
    assertEqual((aylesburyLd.openingHoursSpecification as { opens: string }[])[0]?.opens, '17:30', 'Aylesbury hours stay the usual class time');
    assertEqual(holmerLd.address, {
      '@type': 'PostalAddress',
      streetAddress: 'Parish Piece',
      addressLocality: 'Holmer Green',
      postalCode: 'HP15 6SP',
      addressCountry: 'GB',
    }, 'Holmer Green schema uses the permanent GBP address');
    assert(!JSON.stringify(holmerLd).includes('Sir William Ramsay'), 'Holmer Green schema skips the temporary venue');
    assert(!JSON.stringify(holmerLd).includes('Hazlemere'), 'Holmer Green schema skips the temporary town');
  }
}

const org = buildOrganizationJsonLd();
assertEqual(org['@type'], 'SportsOrganization', 'homepage type');
assertEqual(org['@id'], ORG_ID, 'homepage @id');
assertEqual(org.name, 'Hoop Heroes', 'homepage name');
assertEqual(org.url, 'https://www.hoopheroes.co.uk/', 'homepage url');
assertEqual(org.telephone, '+447700140500', 'homepage telephone');
assertEqual(org.email, 'basketball@hoopheroes.co.uk', 'homepage email');
assertEqual(org.logo, 'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/6929cb514a68807a3d781c96.png', 'homepage logo');
assertEqual(org.address, {
  '@type': 'PostalAddress',
  streetAddress: '59 The Gables',
  addressLocality: 'Aylesbury',
  addressRegion: 'Buckinghamshire',
  postalCode: 'HP17 8AD',
  addressCountry: 'GB',
}, 'homepage address is the registered office');
assert(!('sameAs' in org), 'homepage sameAs omitted');
assert(!('aggregateRating' in org), 'homepage aggregateRating omitted');
assertEqual(HOME_DOCUMENT_TITLE, 'Hoop Heroes Basketball | Youth Basketball Classes UK', 'homepage title constant');

const script = jsonLdScriptTag('hh-location-schema', jsonLd);
assert(script.startsWith('<script type="application/ld+json" id="hh-location-schema">'), 'schema script tag');
assert(script.includes('"@type":"SportsActivityLocation"'), 'schema script body');
assert(!script.includes('<script') || script.indexOf('<script') === 0, 'only one script tag');
