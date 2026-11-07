import { useSyncExternalStore } from 'react';
import { dateOnLondonDay, londonDate } from './venueNotice';

export const LONDON_DATE_GLOBAL = '__HH_LONDON_DATE__';

declare global {
  interface Window {
    __HH_LONDON_DATE__?: string;
  }
}

/** YYYY-MM-DD stamped by the worker before the app module runs. */
export function readRequestLondonDate(): string | null {
  if (typeof window === 'undefined') return null;
  const value = window.__HH_LONDON_DATE__;
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/**
 * London calendar day for date-window content.
 * Prerender has no stamp, so the first paint omits the windows.
 * The worker stamps the same day it uses to fill those slots, and hydration
 * reads that stamp so the first client render matches the served HTML.
 * Dev (empty root, createRoot) falls through to today's London date.
 */
export function useRequestLondonDate(): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => readRequestLondonDate() ?? londonDate(new Date()),
    () => readRequestLondonDate(),
  );
}

export function requestLondonNow(fallback: Date = new Date()): Date {
  const stamp = readRequestLondonDate();
  return stamp ? dateOnLondonDay(stamp) : fallback;
}
