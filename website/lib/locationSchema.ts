// Plain data helpers for Sandhurst SEO. No React import, so the Worker can bundle this.

export const SANDHURST_PAGE_TITLE = 'Kids Basketball Classes in Sandhurst (Ages 5-11) | Hoop Heroes';

export const SANDHURST_META_DESCRIPTION =
  'Youth basketball classes for ages 5-11 in Sandhurst. Weekly sessions with qualified coaches - book your free taster session at Hoop Heroes Sandhurst today.';

const TIME_RANGE = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/;
const AGE_RANGE = /Age\s+(\d+)\s*-\s*(\d+)/i;

export interface SchemaSession {
  day: string;
  time: string;
  ageGroup: string;
  comingSoon?: boolean;
}

export interface SchemaLocation {
  name: string;
  slug: string;
  address: string;
  classes: SchemaSession[];
}

interface BookableSession extends SchemaSession {
  start: string;
  end: string;
}

function padTime(value: string): string {
  const [hours, minutes] = value.split(':');
  return `${hours.padStart(2, '0')}:${minutes}`;
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

export function buildLocationJsonLd(location: SchemaLocation): Record<string, unknown> | null {
  const bookable = bookableSessions(location);
  if (bookable.length === 0) return null;

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

  const event = bookable.map((session) => ({
    '@type': 'Event',
    name: `${session.ageGroup} at Hoop Heroes ${location.name}`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: `Hoop Heroes ${location.name}`,
      address: location.address,
    },
    eventSchedule: {
      '@type': 'Schedule',
      repeatFrequency: 'P1W',
      byDay: `https://schema.org/${session.day}`,
      startTime: session.start,
      endTime: session.end,
    },
  }));

  const description = ages
    ? `Youth basketball classes for ages ${ages.min}-${ages.max} in ${location.name}.`
    : `Youth basketball classes in ${location.name}.`;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: `Hoop Heroes ${location.name}`,
    url: `https://www.hoopheroes.co.uk/location/${location.slug}`,
    description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: location.address,
      addressCountry: 'GB',
    },
    openingHoursSpecification,
    event,
  };

  if (ages) {
    data.audience = {
      '@type': 'PeopleAudience',
      suggestedMinAge: ages.min,
      suggestedMaxAge: ages.max,
    };
  }

  return data;
}
