// Oxford 3v3 Game Day. Shared by the page, Worker SEO, and JSON-LD.
// 25 October 2026 is the UK clock change. BST ends at 01:00 GMT, so 09:00-12:00 is +00:00.

export const GAMEDAY_REGISTRATION_URL =
  'https://goteamup.com/p/6822945-hoop-heroes/courses/139859/';

export const GAMEDAY_PAGE_TITLE = 'Oxford 3v3 Game Day | Hoop Heroes Basketball';

export const GAMEDAY_META_DESCRIPTION =
  'Oxford 3v3 Game Day, Sunday 25 October 2026, 09:00-12:00 at The Oxford Academy sports hall, Oxford OX4 6JZ. Ages 8-15, £30 per player. Registration closes 18 October 2026.';

export const GAMEDAY_EVENT = {
  name: 'Oxford 3v3 Game Day',
  dateLabel: 'Sunday 25 October 2026',
  timesLabel: '09:00 - 12:00',
  locationName: 'The Oxford Academy sports hall',
  addressLabel: 'Sandy Lane West, Oxford OX4 6JZ',
  agesLabel: '8-15 (Split into leagues by age)',
  costLabel: '£30 per player',
  registrationClosesLabel: 'Sunday 18 October 2026',
  summary:
    'Experience the fast-paced excitement of 3x3 basketball with our small internal mini-tournament',
  registrationUrl: GAMEDAY_REGISTRATION_URL,
  halfTermNote: 'It falls in half term.',
  clocksNote: 'Clocks go back that morning (1am) - check your alarm!',
  startDate: '2026-10-25T09:00:00+00:00',
  endDate: '2026-10-25T12:00:00+00:00',
  // Calendar date only. No close time was given.
  registrationValidThrough: '2026-10-18',
  price: '30',
  priceCurrency: 'GBP',
  ageRange: '8-15',
  streetAddress: 'Sandy Lane West',
  addressLocality: 'Oxford',
  postalCode: 'OX4 6JZ',
  pageUrl: 'https://www.hoopheroes.co.uk/3x3-gameday',
} as const;

export function buildGamedayJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: GAMEDAY_EVENT.name,
    description: GAMEDAY_META_DESCRIPTION,
    startDate: GAMEDAY_EVENT.startDate,
    endDate: GAMEDAY_EVENT.endDate,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    url: GAMEDAY_EVENT.pageUrl,
    location: {
      '@type': 'Place',
      name: GAMEDAY_EVENT.locationName,
      address: {
        '@type': 'PostalAddress',
        streetAddress: GAMEDAY_EVENT.streetAddress,
        addressLocality: GAMEDAY_EVENT.addressLocality,
        postalCode: GAMEDAY_EVENT.postalCode,
        addressCountry: 'GB',
      },
    },
    offers: {
      '@type': 'Offer',
      price: GAMEDAY_EVENT.price,
      priceCurrency: GAMEDAY_EVENT.priceCurrency,
      url: GAMEDAY_EVENT.registrationUrl,
      validThrough: GAMEDAY_EVENT.registrationValidThrough,
    },
    typicalAgeRange: GAMEDAY_EVENT.ageRange,
  };
}
