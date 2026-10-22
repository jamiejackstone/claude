import type { LocationData, TemporaryVenue } from '../types.ts';

/** Calendar date in Europe/London as YYYY-MM-DD. */
export function londonDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/** Inclusive of showFrom and showUntil. Both are YYYY-MM-DD compared in Europe/London. */
export function isWithinLondonWindow(
  showFrom: string,
  showUntil: string,
  now: Date = new Date(),
): boolean {
  const today = londonDate(now);
  return today >= showFrom && today <= showUntil;
}

export function activeTemporaryVenues(
  venues: TemporaryVenue[] | undefined,
  now: Date = new Date(),
): TemporaryVenue[] {
  if (!venues?.length) return [];
  return venues.filter((venue) => isWithinLondonWindow(venue.showFrom, venue.showUntil, now));
}

/** Banner, box and booking-widget venue ids all come from this window. */
export function getActiveTemporaryVenues(
  location: Pick<LocationData, 'temporaryVenues'>,
  now: Date = new Date(),
): TemporaryVenue[] {
  return activeTemporaryVenues(location.temporaryVenues, now);
}

function venueIds(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((id) => id.trim()).filter(Boolean);
}

/** Base booking URL, plus venue ids from temporary entries that are showing today. */
export function getBookingWidgetUrl(
  location: Pick<LocationData, 'bookingWidgetUrl' | 'temporaryVenues'>,
  now: Date = new Date(),
): string | undefined {
  const base = location.bookingWidgetUrl;
  if (!base) return undefined;

  const extra = getActiveTemporaryVenues(location, now).flatMap((venue) => venue.teamupVenueIds ?? []);
  const existing = venueIds(new URL(base).searchParams.get('venues'));
  const merged = [...existing];
  for (const id of venueIds(extra.join(','))) {
    if (!merged.includes(id)) merged.push(id);
  }
  if (merged.join(',') === existing.join(',')) return base;

  const url = new URL(base);
  url.searchParams.set('venues', merged.join(','));
  return url.toString().replace(/%2C/g, ',');
}

export function temporaryVenueAnchorId(index: number): string {
  return index === 0 ? 'temporary-venue' : `temporary-venue-${index + 1}`;
}

/** Gold heading at the top of a temporary-venue box. Dates come from the config. */
export function temporaryVenueHeading(sessionDates: string[]): string {
  return `TEMPORARY VENUE: ${sessionDates.join(', ')}`;
}

/** Same embed URL shape as the usual location map. */
export function mapEmbedSrc(mapQuery: string | undefined): string | null {
  const query = mapQuery?.trim();
  if (!query) return null;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=18&ie=UTF8&iwloc=&output=embed`;
}

export function directionsUrl(mapQuery: string | undefined): string | null {
  const query = mapQuery?.trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
