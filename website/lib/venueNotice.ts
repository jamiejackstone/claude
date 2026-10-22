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

/** True while the London calendar date is strictly before expiresOn (YYYY-MM-DD). */
export function isBeforeLondonDate(expiresOn: string, now: Date = new Date()): boolean {
  return londonDate(now) < expiresOn;
}

export interface TempVenueFields {
  tempVenueNotice?: string;
  /** Hidden from this Europe/London calendar date (YYYY-MM-DD). */
  tempVenueNoticeUntil?: string;
}

/** Notice text while it is set and still before its London expiry, otherwise null. */
export function activeTempVenueNotice(
  location: TempVenueFields,
  now: Date = new Date(),
): string | null {
  const text = location.tempVenueNotice?.trim();
  if (!text) return null;
  if (location.tempVenueNoticeUntil && !isBeforeLondonDate(location.tempVenueNoticeUntil, now)) {
    return null;
  }
  return text;
}
