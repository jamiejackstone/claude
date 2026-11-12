import React from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { DeferredEmbed } from './DeferredEmbed';
import {
  dateOnLondonDay,
  directionsUrl,
  getActiveBannerNotices,
  getActiveScheduleNotices,
  getActiveTemporaryVenues,
  mapEmbedSrc,
  temporaryVenueAnchorId,
  temporaryVenueHeading,
  temporaryVenueUsualAside,
} from '../lib/venueNotice';
import type { LocationData, TemporaryVenue } from '../types';

export const DATE_SLOTS = ['banner-notices', 'temporary-venues', 'schedule-notices'] as const;
export type DateSlot = (typeof DATE_SLOTS)[number];

export function LocationTicker({ text, href }: { text: string; href?: string }) {
  const ticker = (
    <div className="bg-brand-orange border-4 border-brand-dark rounded-2xl shadow-sticker overflow-hidden flex items-stretch h-14 motion-reduce:h-auto relative z-30">
      <div className="bg-brand-dark text-white px-4 flex items-center gap-2 shrink-0 border-r-2 border-brand-dark relative z-10">
        <AlertTriangle size={20} className="text-brand-orange animate-pulse motion-reduce:animate-none" />
        <span className="font-display uppercase tracking-wider text-sm">UPDATE</span>
      </div>
      <div className="flex-1 overflow-hidden relative motion-reduce:overflow-visible flex items-center">
        <div className="whitespace-nowrap animate-[marquee_12s_linear_infinite] motion-reduce:animate-none motion-reduce:whitespace-normal flex items-center h-full motion-reduce:py-3">
          <span className="text-brand-dark font-black uppercase text-sm px-4">
            {text}
            <span className="motion-reduce:hidden">
              {' '}&bull;{' '}{text}{' '}&bull;{' '}{text}{' '}&bull;{' '}{text}
            </span>
          </span>
        </div>
      </div>
    </div>
  );

  if (!href) return ticker;
  return (
    <a href={href} className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark">
      {ticker}
    </a>
  );
}

export function TemporaryVenueCard({ venue, anchorId }: { venue: TemporaryVenue; anchorId: string }) {
  const embedSrc = mapEmbedSrc(venue.mapQuery);
  const mapsUrl = directionsUrl(venue.mapQuery);
  const parking = venue.parking?.trim();
  const entry = venue.entry?.trim();

  return (
    <section id={anchorId} className="bg-white rounded-[2.5rem] shadow-sticker border-4 border-brand-dark p-6 md:p-8 scroll-mt-32">
      <p className="text-sm font-black tracking-wide text-brand-orange mb-3">{temporaryVenueHeading(venue.sessionDates)}</p>
      <h2 className="font-display text-3xl md:text-4xl uppercase text-brand-dark leading-none mb-4">{venue.venueName}</h2>
      {venue.timesNote.trim() && (
        <p className="text-sm font-black uppercase tracking-wide text-brand-orange">{venue.timesNote}</p>
      )}
      <ul className="mt-3 space-y-1">
        {venue.times.map((slot) => {
          const usualAside = temporaryVenueUsualAside(slot.time, slot.usualTime);
          return (
            <li key={`${slot.label}-${slot.time}`} className="font-bold text-brand-dark">
              {slot.label} {slot.time}
              {usualAside && <span className="font-medium text-slate-600"> {usualAside}</span>}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 font-bold text-brand-dark leading-snug">{venue.address}</p>
      {embedSrc && (
        <div className="mt-5 rounded-2xl overflow-hidden border-2 border-brand-dark bg-white shadow-inner">
          <div className="h-48">
            <DeferredEmbed
              width="100%"
              height="100%"
              className="w-full h-full"
              style={{ border: 0 }}
              title={`${venue.venueName} map`}
              src={embedSrc}
              loading="lazy"
            />
          </div>
        </div>
      )}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-sm font-black uppercase underline"
        >
          Get directions <ExternalLink size={14} />
        </a>
      )}
      {parking && (
        <p className="mt-4 text-sm font-bold text-brand-dark leading-snug">
          <span className="block text-[10px] font-black uppercase tracking-widest">Parking</span>
          {parking}
        </p>
      )}
      {entry && (
        <p className="mt-3 text-sm font-bold text-brand-dark leading-snug">
          <span className="block text-[10px] font-black uppercase tracking-widest">How to get in</span>
          {entry}
        </p>
      )}
      {venue.siteMapImage?.src && (
        <img
          src={venue.siteMapImage.src}
          alt={venue.siteMapImage.alt}
          className="mt-4 w-full rounded-2xl border-2 border-brand-dark"
          loading="lazy"
        />
      )}
      <p className="mt-4 font-bold text-brand-dark leading-snug">{venue.returnNote}</p>
    </section>
  );
}

/** Empty marker while prerendering. The worker replaces it for the request's London day. */
export function DateSlotMarker({ slot }: { slot: DateSlot }) {
  return <div data-hh-date-slot={slot} hidden />;
}

export function DateWindowOutlet({
  slot,
  location,
  londonDay,
}: {
  slot: DateSlot;
  location: LocationData;
  londonDay: string | null;
}) {
  if (!londonDay) return <DateSlotMarker slot={slot} />;
  const now = dateOnLondonDay(londonDay);

  if (slot === 'banner-notices') {
    const notices = getActiveBannerNotices(location, now);
    if (!notices.length) return null;
    return (
      <>
        {notices.map((notice) => (
          <LocationTicker key={`${notice.showFrom}-${notice.showUntil}-${notice.text}`} text={notice.text} />
        ))}
      </>
    );
  }

  if (slot === 'temporary-venues') {
    const venues = getActiveTemporaryVenues(location, now);
    if (!venues.length) return null;
    return (
      <>
        {venues.map((venue, index) => (
          <LocationTicker key={`${venue.showFrom}-${venue.showUntil}-${index}-ticker`} text={venue.tickerText} href={`#${temporaryVenueAnchorId(index)}`} />
        ))}
        {venues.map((venue, index) => (
          <TemporaryVenueCard key={`${venue.showFrom}-${venue.showUntil}-${index}`} venue={venue} anchorId={temporaryVenueAnchorId(index)} />
        ))}
      </>
    );
  }

  const notices = getActiveScheduleNotices(location, now);
  if (!notices.length) return null;
  return (
    <>
      {notices.map((notice) => (
        <p
          key={`${notice.showFrom}-${notice.showUntil}-${notice.text}`}
          className="mb-4 rounded-xl border-2 border-brand-dark bg-brand-orange/20 px-4 py-3 text-sm font-bold leading-snug text-brand-dark"
        >
          {notice.text}
        </p>
      ))}
    </>
  );
}
