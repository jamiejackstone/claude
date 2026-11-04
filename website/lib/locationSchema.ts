// Plain data helpers for location SEO. No React import, so the Worker can bundle this.

export const SITE_ORIGIN = 'https://www.hoopheroes.co.uk';
export const ORG_ID = `${SITE_ORIGIN}/#org`;
export const ORG_SCHEMA_ID = 'hh-org-schema';
export const LOCATION_SCHEMA_ID = 'hh-location-schema';

export const HOME_DOCUMENT_TITLE = 'Hoop Heroes Basketball | Youth Basketball Classes UK';

export const SANDHURST_PAGE_TITLE = 'Kids Basketball Classes in Sandhurst (Ages 5-11) | Hoop Heroes';

export const SANDHURST_META_DESCRIPTION =
  'Youth basketball classes for ages 5-11 in Sandhurst. Weekly sessions with qualified coaches - book your free taster session at Hoop Heroes Sandhurst today.';

/** Display form. The tel: href is PUBLIC_PHONE_TEL. */
export const PUBLIC_PHONE_DISPLAY = '07700 140500';
export const PUBLIC_PHONE_E164 = '+447700140500';
export const PUBLIC_PHONE_TEL = 'tel:+447700140500';
export const PUBLIC_EMAIL = 'basketball@hoopheroes.co.uk';
export const PUBLIC_EMAIL_MAILTO = 'mailto:basketball@hoopheroes.co.uk';

/** Already used by the logo component. Remote file, not a path in this repo. */
export const HOOP_HEROES_LOGO_URL =
  'https://storage.googleapis.com/msgsndr/9p0wEiLpTaIe1FDTFFQI/media/6929cb514a68807a3d781c96.png';

/** Footer registered office. Not a class venue. */
export const REGISTERED_OFFICE = {
  streetAddress: '59 The Gables',
  addressLocality: 'Aylesbury',
  addressRegion: 'Buckinghamshire',
  postalCode: 'HP17 8AD',
  addressCountry: 'GB' as const,
};

const TIME_RANGE = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/;
const AGE_RANGE = /Age\s+(\d+)\s*-\s*(\d+)/i;

export interface SchemaSession {
  day: string;
  time: string;
  ageGroup: string;
  comingSoon?: boolean;
}

export interface SchemaPostalAddress {
  streetAddress: string;
  addressLocality: string;
  addressRegion?: string;
  postalCode: string;
  addressCountry: string;
}

export interface SchemaGeo {
  lat: number;
  lng: number;
}

export interface SchemaLocation {
  name: string;
  slug: string;
  address: string;
  classes: SchemaSession[];
  coordinates?: SchemaGeo;
  postalAddress?: SchemaPostalAddress;
  schemaAddress: SchemaPostalAddress;
  /** When set, schemaAddress stays on the location but is left out of JSON-LD. */
  schemaAddressHold?: boolean;
  schemaGeo?: SchemaGeo;
  mapsUrl?: string;
}

interface BookableSession extends SchemaSession {
  start: string;
  end: string;
}

function padTime(value: string): string {
  const [hours, minutes] = value.split(':');
  return `${hours.padStart(2, '0')}:${minutes}`;
}

export function locationTownName(location: { slug: string; name: string }): string {
  return location.slug === 'sandhurst' ? 'Sandhurst' : location.name;
}

export function locationDocumentTitle(location: { slug: string; name: string }): string {
  if (location.slug === 'sandhurst') return SANDHURST_PAGE_TITLE;
  return `Kids Basketball Classes in ${locationTownName(location)} | Hoop Heroes`;
}

export function locationH1Text(location: { slug: string; name: string }): string {
  return `Kids Basketball Classes in ${locationTownName(location)}`;
}

export function bookableSessions(location: SchemaLocation): BookableSession[] {
  return location.classes.flatMap((session) => {
    if (session.comingSoon) return [];
    const match = session.time.match(TIME_RANGE);
    if (!match) return [];
    return [{ ...session, start: padTime(match[1]), end: padTime(match[2]) }];
  });
}

export function ageBounds(sessions: { ageGroup: string }[]): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const session of sessions) {
    const match = session.ageGroup.match(AGE_RANGE);
    if (!match) continue;
    min = Math.min(min, Number(match[1]));
    max = Math.max(max, Number(match[2]));
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

export function buildOrganizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    '@id': ORG_ID,
    name: 'Hoop Heroes',
    url: `${SITE_ORIGIN}/`,
    telephone: PUBLIC_PHONE_E164,
    email: PUBLIC_EMAIL,
    logo: HOOP_HEROES_LOGO_URL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: REGISTERED_OFFICE.streetAddress,
      addressLocality: REGISTERED_OFFICE.addressLocality,
      addressRegion: REGISTERED_OFFICE.addressRegion,
      postalCode: REGISTERED_OFFICE.postalCode,
      addressCountry: REGISTERED_OFFICE.addressCountry,
    },
  };
}

export function buildLocationJsonLd(location: SchemaLocation): Record<string, unknown> {
  const bookable = bookableSessions(location);
  const ages = ageBounds(bookable);
  const byDay = new Map<string, { opens: string; closes: string }>();
  for (const session of bookable) {
    const current = byDay.get(session.day);
    if (!current) {
      byDay.set(session.day, { opens: session.start, closes: session.end });
      continue;
    }
    if (session.start < current.opens) current.opens = session.start;
    if (session.end > current.closes) current.closes = session.end;
  }

  const openingHoursSpecification = [...byDay.entries()].map(([day, hours]) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: `https://schema.org/${day}`,
    opens: hours.opens,
    closes: hours.closes,
  }));

  // Weekly classes are recurring sessions, not dated Events. Class dates are
  // not in this repo, so do not emit Event markup (Google requires startDate).
  // Hours come from the classes array, not temporaryVenues and not the TeamUp iframe.

  const area = location.schemaAddress.addressLocality;
  const description = ages
    ? `Youth basketball classes for ages ${ages.min}-${ages.max} in ${area}.`
    : `Youth basketball classes in ${area}.`;

  const address: Record<string, unknown> = {
    '@type': 'PostalAddress',
    streetAddress: location.schemaAddress.streetAddress,
    addressLocality: location.schemaAddress.addressLocality,
    ...(location.schemaAddress.addressRegion
      ? { addressRegion: location.schemaAddress.addressRegion }
      : {}),
    postalCode: location.schemaAddress.postalCode,
    addressCountry: 'GB',
  };

  const pageUrl = `${SITE_ORIGIN}/location/${location.slug}`;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    '@id': `${pageUrl}#location`,
    name: location.name,
    url: pageUrl,
    description,
    parentOrganization: { '@id': ORG_ID },
    telephone: PUBLIC_PHONE_E164,
    audience: {
      '@type': 'PeopleAudience',
      suggestedMinAge: 5,
      suggestedMaxAge: 15,
    },
  };

  if (!location.schemaAddressHold) {
    data.address = address;
  }

  if (openingHoursSpecification.length > 0) {
    data.openingHoursSpecification = openingHoursSpecification;
  }

  if (location.schemaGeo) {
    data.geo = {
      '@type': 'GeoCoordinates',
      latitude: location.schemaGeo.lat,
      longitude: location.schemaGeo.lng,
    };
  }

  if (location.mapsUrl) {
    data.hasMap = location.mapsUrl;
  }

  return data;
}

export function jsonLdScriptTag(id: string, data: Record<string, unknown> | null): string {
  if (!data) return '';
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json" id="${id}">${json}</script>`;
}
