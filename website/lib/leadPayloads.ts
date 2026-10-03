import {
  type TrackedParams,
  clickIdFields,
  ghlClickIdCustomFields,
} from './clickTracking';
import { TASTER_CLICK_SOURCE, TASTER_CLICK_TAG } from './tasterPrecapture';

export const ACCIDENT_FORM_URL = 'https://link.halomarketinghub.com/widget/form/lpGjE9ktlOROvEaaAu7d';

export interface HiddenClickField {
  name: string;
  value: string;
}

/** Hidden inputs keyed hh_gclid, gbraid, and wbraid. Empty ids are omitted. */
export function ghlHiddenClickInputs(clickIds: TrackedParams): HiddenClickField[] {
  return ghlClickIdCustomFields(clickIds).map((entry) => ({
    name: entry.key,
    value: entry.fieldValue,
  }));
}

/**
 * GHL form iframes cannot read the parent cookie.
 * Query keys on the iframe URL are how hidden fields get their values.
 */
export function withGhlFormClickFields(url: string, clickIds: TrackedParams): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  let changed = false;
  for (const field of ghlHiddenClickInputs(clickIds)) {
    if (parsed.searchParams.has(field.name)) continue;
    parsed.searchParams.set(field.name, field.value);
    changed = true;
  }
  return changed ? parsed.toString() : url;
}

export function waitlistRequestBody(input: {
  name: string;
  email: string;
  phone: string;
  locationName: string;
  ghlTag?: string;
  clickIds: TrackedParams;
}): Record<string, unknown> {
  return {
    name: input.name,
    email: input.email,
    phone: input.phone,
    locationName: input.locationName,
    tags: [
      input.locationName,
      input.ghlTag || `${input.locationName} Waitlist`,
      'Source: Website Waitlist',
    ],
    source: `Website Waitlist - ${input.locationName}`,
    ...clickIdFields(input.clickIds),
  };
}

export function careersRequestBody(input: {
  name: string;
  email: string;
  phone: string;
  location: string;
  about: string;
  role: string;
  clickIds: TrackedParams;
}): Record<string, unknown> {
  return {
    type: 'careers',
    name: input.name,
    email: input.email,
    phone: input.phone,
    location: input.location,
    about: input.about,
    role: input.role,
    ...clickIdFields(input.clickIds),
  };
}

export function tasterClickRequestBody(input: {
  name: string;
  email: string;
  clickIds: TrackedParams;
}): Record<string, unknown> {
  return {
    name: input.name,
    email: input.email,
    tag: TASTER_CLICK_TAG,
    source: TASTER_CLICK_SOURCE,
    ...clickIdFields(input.clickIds),
  };
}
