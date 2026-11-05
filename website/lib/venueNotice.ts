import type { LocationData, LocationNotice, TemporaryVenue, TemporaryVenueTime } from '../types.ts';

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

/** Noon UTC stays on the same Europe/London calendar day in GMT and BST. */
export function dateOnLondonDay(londonDay: string): Date {
  return new Date(`${londonDay}T12:00:00.000Z`);
}

export function getActiveLocationNotices(
  location: { notices?: LocationNotice[] },
  now: Date = new Date(),
): LocationNotice[] {
  if (!location.notices?.length) return [];
  return location.notices.filter((notice) => {
    if (!notice?.text?.trim() || !notice.showFrom || !notice.showUntil) return false;
    return isWithinLondonWindow(notice.showFrom, notice.showUntil, now);
  });
}

/** UPDATE banner. Any placement other than `schedule` stays here, including unset. */
export function getActiveBannerNotices(
  location: { notices?: LocationNotice[] },
  now: Date = new Date(),
): LocationNotice[] {
  return getActiveLocationNotices(location, now).filter((notice) => notice.placement !== 'schedule');
}

/** Top of the Class Schedule section. */
export function getActiveScheduleNotices(
  location: { notices?: LocationNotice[] },
  now: Date = new Date(),
): LocationNotice[] {
  return getActiveLocationNotices(location, now).filter((notice) => notice.placement === 'schedule');
}

/** Phrases that belong only to date windows, so a build can assert they were not baked in. */
export function bakedDateWindowPhrases(location: Pick<LocationData, 'address' | 'scheduleNotice' | 'locationNotes' | 'newsTicker' | 'name' | 'temporaryVenues' | 'notices'>): string[] {
  const permanent = [location.address, location.scheduleNotice, location.locationNotes, location.newsTicker, location.name]
    .filter(Boolean)
    .join('\n');
  const phrases: string[] = [];
  const add = (value: string | undefined) => {
    const text = value?.trim();
    if (!text || text.length < 8 || permanent.includes(text)) return;
    phrases.push(text);
  };
  for (const venue of location.temporaryVenues ?? []) {
    add(venue.tickerText);
    add(venue.returnNote);
    add(venue.venueName);
    add(venue.address);
    add(venue.parking);
    add(venue.entry);
    add(venue.timesNote);
    add(temporaryVenueHeading(venue.sessionDates));
    for (const sessionDate of venue.sessionDates) add(sessionDate);
  }
  for (const notice of location.notices ?? []) add(notice.text);
  return phrases;
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

/** Compare session times without treating spacing or dash style as a change. */
function normaliseSessionTime(value: string): string {
  return value.trim().replace(/[–—]/g, '-').replace(/\s+/g, '');
}

/**
 * Parenthetical usual time. Omitted when the session runs at its normal time,
 * so an unchanged slot does not say "(usually …)" beside the same time.
 */
export function temporaryVenueUsualAside(time: string, usualTime: string): string | null {
  const usual = usualTime.trim();
  if (!usual || normaliseSessionTime(time) === normaliseSessionTime(usual)) return null;
  return `(usually ${usual})`;
}

/** Visible time line for one slot, including the usual-time aside only when it differs. */
export function temporaryVenueTimeLine(slot: TemporaryVenueTime): string {
  const aside = temporaryVenueUsualAside(slot.time, slot.usualTime);
  return aside ? `${slot.label} ${slot.time} ${aside}` : `${slot.label} ${slot.time}`;
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
