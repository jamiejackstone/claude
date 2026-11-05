import React from 'react';
import { renderToString } from 'react-dom/server';
import { DATE_SLOTS, DateSlotMarker, DateWindowOutlet, type DateSlot } from '../components/DateWindows';
import { LONDON_DATE_GLOBAL } from './requestDate';
import type { LocationData } from '../types';
import { londonDate } from './venueNotice';

export function dateSlotMarker(slot: DateSlot): string {
  return renderToString(React.createElement(DateSlotMarker, { slot }));
}

export function renderDateWindow(slot: DateSlot, location: LocationData, londonDay: string): string {
  return renderToString(React.createElement(DateWindowOutlet, { slot, location, londonDay }));
}

export function injectLondonDateScript(html: string, londonDay: string): string {
  if (html.includes(LONDON_DATE_GLOBAL)) return html;
  const tag = `<script>window.${LONDON_DATE_GLOBAL}=${JSON.stringify(londonDay)};</script>`;
  if (html.includes('</head>')) return html.replace('</head>', `${tag}</head>`);
  return `${tag}${html}`;
}

/** Replace prerender markers with the windows that are active on londonDay. */
export function injectDateWindows(html: string, location: LocationData, londonDay: string): string {
  let next = html;
  for (const slot of DATE_SLOTS) {
    const marker = dateSlotMarker(slot);
    if (!next.includes(marker)) continue;
    next = next.split(marker).join(renderDateWindow(slot, location, londonDay));
  }
  return next;
}

export function injectServedHtml(
  html: string,
  options: { location?: LocationData | null; now?: Date },
): string {
  const day = londonDate(options.now ?? new Date());
  let next = injectLondonDateScript(html, day);
  if (options.location) next = injectDateWindows(next, options.location, day);
  return next;
}
