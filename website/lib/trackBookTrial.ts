// Trial-booking clicks for GTM. Same consent gate as trackWaitlistLead:
// the dataLayer event is pushed only when stored consent is exactly 'accepted',
// which is when Consent Mode has granted analytics_storage / ad_storage.
// No Google Ads, GTM, or Meta call happens here. The push is synchronous and
// never throws, so the CTA navigation is not blocked or delayed.

import { isConsented } from './metaPixel';

export const BOOK_TRIAL_CLICK_EVENT = 'book_trial_click';

export interface BookTrialClick {
  location_slug: string;
  button_position: string;
  link_url: string;
}

interface DataLayerWindow {
  dataLayer?: unknown[];
}

function browserWindow(): DataLayerWindow | null {
  const candidate = (globalThis as { window?: DataLayerWindow }).window;
  if (!candidate || typeof candidate !== 'object') return null;
  return candidate;
}

function slugOrNone(value: string): string {
  const trimmed = value.trim();
  return trimmed || 'none';
}

/** Push book_trial_click. No-ops unless cookie consent is 'accepted'. */
export function trackBookTrialClick(click: BookTrialClick): void {
  try {
    if (!isConsented()) return;
    const w = browserWindow();
    if (!w) return;
    const linkUrl = typeof click.link_url === 'string' ? click.link_url : '';
    const buttonPosition = typeof click.button_position === 'string' ? click.button_position : '';
    const locationSlug = typeof click.location_slug === 'string' ? slugOrNone(click.location_slug) : 'none';
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({
      event: BOOK_TRIAL_CLICK_EVENT,
      location_slug: locationSlug,
      button_position: buttonPosition,
      link_url: linkUrl,
    });
  } catch {
    // Tracking must not interrupt the booking navigation.
  }
}
