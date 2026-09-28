// Cloudflare Worker serving the Hoop Heroes API alongside the static SPA assets.
// Replaces the previous Express server (server.ts) from the AI Studio export.

import { LOCATIONS } from '../constants';
import {
  type TrackedParams,
  buildGoDestination,
  clickIdsFromRecord,
  ghlClickIdCustomFields,
  ghlV1ClickIdCustomField,
  mergeIncomingSearch,
} from '../lib/clickTracking';
import {
  SANDHURST_META_DESCRIPTION,
  SANDHURST_PAGE_TITLE,
  buildLocationJsonLd,
} from '../lib/locationSchema';

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  RESEND_API_KEY?: string;
  GHL_API_KEY?: string;
  GHL_HR_WEBHOOK_URL?: string;
  GHL_HR_API_KEY?: string;
  GHL_CAREERS_WEBHOOK_URL?: string;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

// Normalize UK phone numbers to E.164 for GHL
function normalizePhone(phone: string): string {
  let normalized = phone.trim().replace(/\s+/g, '');
  if (normalized.startsWith('0') && !normalized.startsWith('00')) {
    normalized = '+44' + normalized.substring(1);
  }
  return normalized;
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(' ');
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') || '.' };
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendResendEmail(env: Env, payload: {
  to: string;
  subject: string;
  html: string;
  replyTo: string;
}): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Hoop Heroes Website <no-reply@notifications.hoopheroes.co.uk>',
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      reply_to: payload.replyTo,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Resend API Error:', response.status, errText);
    return { ok: false, error: errText };
  }
  return { ok: true };
}

// hh_gclid, gbraid, and wbraid use the verified field ids. Native contact.gclid is not sent.
function attachClickIdCustomFields(payload: Record<string, unknown>, clickIds: TrackedParams): void {
  const customFields = ghlClickIdCustomFields(clickIds);
  const customField = ghlV1ClickIdCustomField(clickIds);
  if (customFields.length) payload.customFields = customFields;
  if (customField) payload.customField = customField;
}

// Main-location waitlist still uses GHL API v1.
// HR careers uses the v2 helpers further down.
async function ghlRequest(apiKey: string, path: string, method: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`https://rest.gohighlevel.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function lookupContactId(apiKey: string, email: string): Promise<string | null> {
  const url = `https://rest.gohighlevel.com/v1/contacts/lookup?email=${encodeURIComponent(email)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!response.ok) {
      console.error('[GHL] contact lookup failed:', response.status, await response.text());
      return null;
    }
    const data = await response.json() as { contacts?: { id?: string }[]; contact?: { id?: string } };
    const id = data.contacts?.[0]?.id || data.contact?.id || null;
    if (id) return id;
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return null;
}

async function stampClickIdFields(apiKey: string, email: string, clickIds: TrackedParams): Promise<void> {
  const customField = ghlV1ClickIdCustomField(clickIds);
  const customFields = ghlClickIdCustomFields(clickIds);
  if (!customField) return;
  const contactId = await lookupContactId(apiKey, email);
  if (!contactId) {
    console.warn('[GHL] click ids not stamped; contact not found yet');
    return;
  }
  const attempts: Record<string, unknown>[] = [{ customFields, customField }, { customField }];
  for (const body of attempts) {
    const response = await ghlRequest(apiKey, `/contacts/${contactId}`, 'PUT', body);
    if (response.ok) {
      console.log(`[GHL] stamped ${customFields.map((entry) => entry.key).join(', ')}`);
      return;
    }
    console.warn('[GHL] click-id update failed:', response.status, (await response.text()).slice(0, 400));
  }
}

// Hoop Heroes HR sub-account. Verified in GHL: "Hoop Heroes HR", Europe/London.
const HR_GHL_LOCATION_ID = 'zxMh9T37AzC9DytMDQGr';

/** Coaching Location(s). GHL key contact.preferred_location. MULTIPLE_OPTIONS. */
const HR_COACHING_LOCATION_FIELD = {
  id: 'xTVtfVcxCcLKDslvR5AY',
  key: 'preferred_location',
} as const;

const HR_COACHING_LOCATIONS = [
  'Aylesbury',
  'Wendover',
  'Tring',
  'Marlow',
  'Holmer Green',
  'Great Missenden',
  'Bicester',
  'Oxford',
  'Sandhurst',
] as const;

/** Coach: Role. GHL key contact.role. SINGLE_OPTIONS. */
const HR_COACH_ROLE_FIELD = {
  id: 'U1NmOQc8eMon4gyVHvAj',
  key: 'role',
} as const;

const HR_COACH_ROLES = [
  'Head Coach',
  'Assistant Coach',
  'Junior Assistant Coach',
  'Head Coach in Training',
] as const;

/**
 * Careers form buttons in website/pages/Careers.tsx.
 * Volunteer Coach is a form option with no Coach: Role value: the description
 * covers parents, DofE candidates, and junior assistants, so it is not stored
 * as Junior Assistant Coach. It is omitted from the field and written on the note.
 * Junior Assistant Coach and Head Coach in Training are accepted when the raw
 * value already matches those spellings; the form does not offer them.
 */
const HR_FORM_ROLE_TO_GHL: Record<string, (typeof HR_COACH_ROLES)[number]> = {
  'head coach': 'Head Coach',
  'assistant coach': 'Assistant Coach',
};
const GHL_V2_BASE = 'https://services.leadconnectorhq.com';
const GHL_V2_VERSION = '2021-07-28';

function ghlV2Headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: GHL_V2_VERSION,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function ghlV2Request(
  apiKey: string,
  path: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${GHL_V2_BASE}${path}`, {
    method,
    headers: ghlV2Headers(apiKey),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function contactIdFromPayload(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as {
    id?: unknown;
    contact?: { id?: unknown };
    contacts?: { id?: unknown }[];
  };
  const id = record.contact?.id || record.contacts?.[0]?.id || record.id;
  return typeof id === 'string' && id ? id : null;
}

/** Split a free-text location, trim, and keep only exact allowed spellings. */
function normaliseCoachingLocations(input: unknown): string[] {
  if (typeof input !== 'string' || !input.trim()) return [];
  const allowed = new Map(HR_COACHING_LOCATIONS.map((name) => [name.toLowerCase(), name]));
  const matched: string[] = [];
  const unknown: string[] = [];
  const seen = new Set<string>();
  for (const part of input.split(/\s*(?:,|;|\/|&|\band\b)\s*/i)) {
    const value = part.trim();
    if (!value) continue;
    const exact = allowed.get(value.toLowerCase());
    if (!exact) {
      unknown.push(value);
      continue;
    }
    if (seen.has(exact)) continue;
    seen.add(exact);
    matched.push(exact);
  }
  if (unknown.length) {
    console.warn('[HR] coaching location values not in the allowed list:', unknown.join(', '));
  }
  return matched;
}

function mapHrCoachRole(input: unknown): { value: string | null; unmappedRaw: string | null } {
  if (typeof input !== 'string') return { value: null, unmappedRaw: null };
  const raw = input.trim();
  if (!raw) return { value: null, unmappedRaw: null };
  const key = raw.toLowerCase();
  const fromForm = HR_FORM_ROLE_TO_GHL[key];
  if (fromForm) return { value: fromForm, unmappedRaw: null };
  const fromAllowed = HR_COACH_ROLES.find((role) => role.toLowerCase() === key);
  if (fromAllowed) return { value: fromAllowed, unmappedRaw: null };
  console.warn('[HR] role does not map to Coach: Role:', raw);
  return { value: null, unmappedRaw: raw };
}

function hrContactNote(about: unknown, unmappedRole: string | null): string | null {
  const aboutText = typeof about === 'string' ? about.trim() : '';
  const lines: string[] = [];
  if (aboutText) lines.push(aboutText);
  if (unmappedRole) lines.push(`Role applied (unmapped): ${unmappedRole}`);
  return lines.length ? lines.join('\n') : null;
}

interface HrCustomField {
  id: string;
  key: string;
  fieldValue: string | string[];
}

/**
 * v2 upsert body for the HR sub-account.
 * Tags are omitted: an upsert replaces every tag on an existing contact.
 * `sub_account` is not a v2 field and is not sent.
 * Notes are posted separately after the contact id comes back.
 */
function prepareHrUpsert(career: Record<string, unknown>): { body: Record<string, unknown>; note: string | null } {
  const customFields: HrCustomField[] = [];
  if (Array.isArray(career.customFields)) {
    for (const entry of career.customFields) {
      if (entry && typeof entry === 'object') customFields.push(entry as HrCustomField);
    }
  }
  const locations = normaliseCoachingLocations(career.nearest_hh_location);
  if (locations.length) {
    customFields.push({
      id: HR_COACHING_LOCATION_FIELD.id,
      key: HR_COACHING_LOCATION_FIELD.key,
      fieldValue: locations,
    });
  }
  const role = mapHrCoachRole(career.role_applied);
  if (role.value) {
    customFields.push({
      id: HR_COACH_ROLE_FIELD.id,
      key: HR_COACH_ROLE_FIELD.key,
      fieldValue: role.value,
    });
  }
  const body: Record<string, unknown> = {
    locationId: HR_GHL_LOCATION_ID,
    firstName: career.firstName,
    lastName: career.lastName,
    name: career.name,
    email: career.email,
    source: career.source,
  };
  if (typeof career.phone === 'string' && career.phone) body.phone = career.phone;
  if (customFields.length) body.customFields = customFields;
  return { body, note: hrContactNote(career.notes, role.unmappedRaw) };
}

/** On 400/422, retry once without custom fields so the application is not dropped. Tags and the note still run. */
async function upsertHrContact(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; contactId: string | null }> {
  let response = await ghlV2Request(apiKey, '/contacts/upsert', 'POST', body);
  if (!response.ok && body.customFields && (response.status === 400 || response.status === 422)) {
    console.error('[HR Sub-Account] GHL API Error:', response.status, await response.text());
    const withoutClickIds = { ...body };
    delete withoutClickIds.customFields;
    console.warn('[HR Sub-Account] retrying without custom fields');
    response = await ghlV2Request(apiKey, '/contacts/upsert', 'POST', withoutClickIds);
  }
  if (!response.ok) {
    console.error('[HR Sub-Account] GHL API Error:', response.status, await response.text());
    return { ok: false, contactId: null };
  }
  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  const contactId = contactIdFromPayload(data);
  if (!contactId) console.warn('[HR] upsert succeeded without a contact id; tags and notes were not added');
  return { ok: true, contactId };
}

/** A failure is logged and does not fail the application. */
async function addHrContactNote(apiKey: string, contactId: string, body: string): Promise<void> {
  try {
    const response = await ghlV2Request(apiKey, `/contacts/${contactId}/notes`, 'POST', { body });
    if (!response.ok) {
      console.error('[HR] note create failed:', response.status, (await response.text()).slice(0, 400));
    }
  } catch (err) {
    console.error('[HR] note create failed:', err);
  }
}

/** Adds tags without replacing existing ones. A failure is logged and does not fail the application. */
async function addHrContactTags(apiKey: string, contactId: string, tags: string[]): Promise<void> {
  if (!tags.length) return;
  try {
    const response = await ghlV2Request(apiKey, `/contacts/${contactId}/tags`, 'POST', { tags });
    if (!response.ok) {
      console.error('[HR] tag update failed:', response.status, (await response.text()).slice(0, 400));
    }
  } catch (err) {
    console.error('[HR] tag update failed:', err);
  }
}

async function lookupHrContactId(apiKey: string, email: string): Promise<string | null> {
  const params = new URLSearchParams({ locationId: HR_GHL_LOCATION_ID, email });
  const path = `/contacts/search/duplicate?${params.toString()}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await ghlV2Request(apiKey, path, 'GET');
    if (!response.ok) {
      console.error('[HR] contact lookup failed:', response.status, await response.text());
      return null;
    }
    const data = await response.json() as { contacts?: { id?: string }[]; contact?: { id?: string } };
    const id = contactIdFromPayload(data);
    if (id) return id;
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return null;
}

/** Follow-up click-id stamp after the HR inbound webhook. Does not send tags. */
async function stampHrClickIds(apiKey: string, email: string, clickIds: TrackedParams): Promise<void> {
  const customFields = ghlClickIdCustomFields(clickIds);
  if (!customFields.length || !email) return;
  const contactId = await lookupHrContactId(apiKey, email);
  if (!contactId) {
    console.warn('[HR] click ids not stamped; contact not found yet');
    return;
  }
  const response = await ghlV2Request(apiKey, `/contacts/${contactId}`, 'PUT', { customFields });
  if (!response.ok) {
    console.warn('[HR] click-id update failed:', response.status, (await response.text()).slice(0, 400));
    return;
  }
  console.log(`[HR] stamped ${customFields.map((entry) => entry.key).join(', ')}`);
}

// POST /api/contact — coaching applications into the Hoop Heroes HR GHL
// sub-account. Resend email is an optional extra that only runs when
// RESEND_API_KEY is configured.
async function handleContact(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, string>;
  const { type, name, email, phone, location, about, role } = body;
  const clickIds = clickIdsFromRecord(body);

  let delivered = false;

  if (type === 'careers') {
    const nameText = typeof name === 'string' ? name.trim() : '';
    const roleText = typeof role === 'string' ? role : '';
    const emailText = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const phoneText = typeof phone === 'string' ? normalizePhone(phone) : '';
    const { firstName, lastName } = splitName(nameText);
    const tags = ['coach', 'recruitment', roleText.toLowerCase().replace(/\s+/g, '_'), roleText];
    const careerPayload: Record<string, unknown> = {
      firstName,
      lastName,
      name: nameText,
      email: emailText,
      tags,
      source: 'Website HR & Recruitment Form',
      notes: about,
      nearest_hh_location: location,
      role_applied: roleText,
      sub_account: 'HR & Recruitment',
    };
    if (phoneText) careerPayload.phone = phoneText;
    attachClickIdCustomFields(careerPayload, clickIds);

    const HR_WEBHOOK_URL = env.GHL_HR_WEBHOOK_URL || env.GHL_CAREERS_WEBHOOK_URL;

    if (HR_WEBHOOK_URL) {
      const webhookResponse = await fetch(HR_WEBHOOK_URL, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(careerPayload),
      });
      delivered = webhookResponse.ok;
      if (!webhookResponse.ok) {
        console.error('[HR Sub-Account Webhook] Error:', webhookResponse.status, await webhookResponse.text());
      } else if (env.GHL_HR_API_KEY) {
        try {
          await stampHrClickIds(env.GHL_HR_API_KEY, emailText, clickIds);
        } catch (stampErr) {
          console.error('[HR] click-id stamp error:', stampErr);
        }
      }
    } else if (env.GHL_HR_API_KEY) {
      const prepared = prepareHrUpsert(careerPayload);
      const upsert = await upsertHrContact(env.GHL_HR_API_KEY, prepared.body);
      delivered = upsert.ok;
      if (upsert.ok && upsert.contactId) {
        await addHrContactTags(env.GHL_HR_API_KEY, upsert.contactId, tags);
        if (prepared.note) await addHrContactNote(env.GHL_HR_API_KEY, upsert.contactId, prepared.note);
      }
    } else {
      return json({
        error: 'CRM Configuration Error',
        details: 'GHL_HR_WEBHOOK_URL or GHL_HR_API_KEY is missing. Set one in the Worker settings.',
      }, 500);
    }

  } else {
    return json({ error: 'Invalid enquiry type' }, 400);
  }

  // Optional email notification — never fails the submission if it errors
  if (env.RESEND_API_KEY) {
    const subject = `New Careers Application: ${role} - ${name}`;
    const html = `
      <h1>New Careers Application</h1>
      <p><strong>Role:</strong> ${escapeHtml(role)}</p>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p><strong>Preferred Location:</strong> ${escapeHtml(location)}</p>
      <p><strong>About:</strong></p>
      <p>${escapeHtml(about)}</p>
    `;
    try {
      await sendResendEmail(env, { to: 'careers@hoopheroes.co.uk', subject, html, replyTo: email });
    } catch (emailErr) {
      console.error('Resend email error:', emailErr);
    }
  }

  if (!delivered) {
    return json({ error: 'Failed to submit to CRM' }, 502);
  }
  return json({ success: true });
}

// POST /api/waitlist — Taster/waitlist leads into the main GHL account
async function handleWaitlist(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, any>;
  const { name, email, phone, tags, source, locationName } = body;
  const clickIds = clickIdsFromRecord(body);

  const { firstName, lastName } = splitName(name);
  const leadPayload: Record<string, unknown> = {
    firstName,
    lastName,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: normalizePhone(phone),
    tags: Array.isArray(tags) ? tags : [tags],
    source,
    locationName,
  };
  attachClickIdCustomFields(leadPayload, clickIds);
  const leadEmail = String(leadPayload.email);

  // Location-specific GHL inbound webhooks take priority over the API
  const WEBHOOK_MAP: Record<string, string> = {
    Oxford: 'https://services.leadconnectorhq.com/hooks/9p0wEiLpTaIe1FDTFFQI/webhook-trigger/13da14ad-a351-4367-b715-99d0fb131ed7',
  };

  if (WEBHOOK_MAP[locationName]) {
    const webhookResponse = await fetch(WEBHOOK_MAP[locationName], {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(leadPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('[Webhook] Error:', webhookResponse.status, errorText);
      return json({ error: 'Webhook submission failed', details: errorText }, webhookResponse.status);
    }
    if (env.GHL_API_KEY) {
      try {
        await stampClickIdFields(env.GHL_API_KEY, leadEmail, clickIds);
      } catch (stampErr) {
        console.error('[Waitlist] click-id stamp error:', stampErr);
      }
    }
    return json({ success: true, message: `Lead sent to ${locationName} webhook` });
  }

  if (!env.GHL_API_KEY) {
    console.error('GHL_API_KEY is not configured');
    return json({
      error: 'CRM Configuration Error',
      details: 'GHL_API_KEY is missing. Set it with: wrangler secret put GHL_API_KEY',
    }, 500);
  }

  let ghlResponse = await ghlRequest(env.GHL_API_KEY, '/contacts/', 'POST', leadPayload);
  if (!ghlResponse.ok && (leadPayload.customFields || leadPayload.customField) && (ghlResponse.status === 400 || ghlResponse.status === 422)) {
    console.error('[GHL] API Error:', ghlResponse.status, await ghlResponse.text());
    const withoutArray = { ...leadPayload };
    delete withoutArray.customFields;
    ghlResponse = await ghlRequest(env.GHL_API_KEY, '/contacts/', 'POST', withoutArray);
    if (!ghlResponse.ok) {
      delete withoutArray.customField;
      console.warn('[GHL] retrying waitlist create without click-id fields');
      ghlResponse = await ghlRequest(env.GHL_API_KEY, '/contacts/', 'POST', withoutArray);
    }
  }

  const responseText = await ghlResponse.text();
  let data: unknown;
  try {
    data = JSON.parse(responseText);
  } catch {
    data = { rawResponse: responseText };
  }

  if (!ghlResponse.ok) {
    console.error('[GHL] API Error:', ghlResponse.status, data);
    return json({ error: 'Failed to submit to CRM', details: data }, ghlResponse.status);
  }
  return json({ success: true, data });
}

const LOCATION_NAMES: Record<string, string> = {
  aylesbury: 'Aylesbury',
  'great-missenden': 'Great Missenden',
  'holmer-green': 'Holmer Green',
  bicester: 'Bicester',
  wendover: 'Wendover',
  oxford: 'Oxford',
  marlow: 'Marlow',
  tring: 'Tring',
  sandhurst: 'Sandhurst',
};

// GET /go/:slug — QR code short redirects for printed banners & flyers
const VALID_GO_SLUGS = Object.keys(LOCATION_NAMES);

function handleGoRedirect(url: URL): Response {
  const rawSlug = (url.pathname.split('/')[2] || '').toLowerCase().trim();
  if (!rawSlug || !VALID_GO_SLUGS.includes(rawSlug)) {
    return Response.redirect(mergeIncomingSearch('/', url.origin, url.searchParams), 302);
  }

  const src = url.searchParams.get('src');
  const utmSource = src === 'banner' ? 'banner' : src === 'flyer' ? 'flyer' : 'print';

  return Response.redirect(buildGoDestination(url.origin, rawSlug, utmSource, url.search), 302);
}

// Permanent redirects for legacy URLs that have a current equivalent.
// Old URLs with NO equivalent are deliberately absent — they return a real
// 404 below so search engines drop them from the index.
const LEGACY_REDIRECTS: Record<string, string> = {
  '/terms': '/policies?section=terms',
  '/3x3-leagues': '/3x3-gameday',
  '/privacy': '/policies?section=privacy',
  '/safeguarding': '/policies?section=safeguarding',
  '/code-of-conduct': '/policies?section=conduct',
  '/find-us': '/',
  '/franchise': '/',
  '/admin': '/',
  '/bracknell': '/',
  '/crowthorne': '/',
  '/locations': '/',
  '/free-trial': '/',
  '/book-a-free-trial': '/',
  '/about': '/mission',
  '/contact': '/',
  '/blog': '/',
  '/pricing': '/',
  '/basketball-camps': '/',
  '/holmergreen': '/location/holmer-green',
  '/windsor': '/',
  '/aylesbury': '/location/aylesbury',
  '/bicester': '/location/bicester',
  '/marlow': '/location/marlow',
  '/holmer-green': '/location/holmer-green',
  '/princes-risborough': '/location/wendover',
  '/wendover': '/location/wendover',
  '/tring': '/location/tring',
  '/great-missenden': '/location/great-missenden',
  '/oxford': '/location/oxford',
  '/sandhurst': '/location/sandhurst',
};

// Plural /locations/:slug → singular /location/:slug for known venues only
// (covers /locations/sandhurst and the same typo for every current location).
function locationsPluralTarget(path: string): string | null {
  if (!path.startsWith('/locations/')) return null;
  const slug = path.slice('/locations/'.length);
  if (!slug || slug.includes('/') || !LOCATION_NAMES[slug]) return null;
  return `/location/${slug}`;
}

function legacyRedirectTarget(path: string): string | null {
  return LEGACY_REDIRECTS[path] || locationsPluralTarget(path);
}

// ---------------------------------------------------------------------------
// Per-page <title>, meta description and canonical, injected into the served
// HTML at the edge so search engines see unique metadata without SSR.
// PAGE_META also doubles as the list of valid pages: any path without an
// entry (and no file extension) is served with a 404 status.
// HTMLRewriter is a Workers runtime built-in; minimal typings for tsc:
declare class HTMLRewriter {
  on(
    selector: string,
    handlers: {
      element?(el: {
        setInnerContent(text: string): void;
        setAttribute(name: string, value: string): void;
        append(content: string, opts?: { html?: boolean }): void;
      }): void;
    },
  ): HTMLRewriter;
  transform(response: Response): Response;
}

const SITE_ORIGIN = 'https://www.hoopheroes.co.uk';

const PAGE_META: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Hoop Heroes Basketball | Youth Basketball Classes UK',
    description:
      'Fun, high-energy youth basketball classes for ages 5-15 across Buckinghamshire, Oxfordshire, Hertfordshire and Berkshire. Book a free taster session today.',
  },
  '/mission': {
    title: 'Our Mission | Hoop Heroes Basketball',
    description:
      "Game time over screen time. Discover Hoop Heroes' mission to develop respect, confidence and teamwork in young people through basketball.",
  },
  '/careers': {
    title: 'Basketball Coaching Jobs | Hoop Heroes Careers',
    description:
      'Join the Hoop Heroes team. Head coach, assistant coach and volunteer coaching opportunities at youth basketball clubs across the UK.',
  },
  '/policies': {
    title: 'Policies & Membership Terms | Hoop Heroes Basketball',
    description:
      'Hoop Heroes policies: membership terms and conditions, privacy policy, safeguarding policy and code of conduct.',
  },
  '/3x3-gameday': {
    title: '3x3 Gameday | Hoop Heroes Basketball',
    description:
      'The Hoop Heroes 3x3 Gameday — a fast-paced 3-on-3 basketball tournament for Hoop Heroes members aged 8-15.',
  },
  '/accident': {
    title: 'Accident Report | Hoop Heroes',
    description: 'Accident and incident reporting form for Hoop Heroes coaching staff.',
  },
};

function pageMetaFor(path: string): { title: string; description: string } | null {
  if (PAGE_META[path]) return PAGE_META[path];
  if (path.startsWith('/location/')) {
    const slug = path.split('/')[2] || '';
    const name = LOCATION_NAMES[slug];
    if (!name) return null;
    if (slug === 'sandhurst') {
      return {
        title: SANDHURST_PAGE_TITLE,
        description: SANDHURST_META_DESCRIPTION,
      };
    }
    return {
      title: `Kids Basketball Classes in ${name} | Hoop Heroes`,
      description: `Youth basketball classes for ages 5-15 in ${name}. Weekly sessions with qualified coaches — book your free taster session at Hoop Heroes ${name} today.`,
    };
  }
  return null;
}

function sandhurstHeadExtras(meta: { title: string; description: string }): string {
  const location = LOCATIONS.find((item) => item.slug === 'sandhurst');
  const jsonLd = location ? buildLocationJsonLd(location) : null;
  const script = jsonLd
    ? `<script type="application/ld+json" id="hh-location-schema">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`
    : '';
  return [
    `<meta property="og:title" content="${escapeHtml(meta.title)}">`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
    script,
  ].join('');
}

function injectMeta(
  response: Response,
  meta: { title: string; description: string },
  canonicalPath: string | null,
): Response {
  let rewriter = new HTMLRewriter()
    .on('title', { element: (el) => el.setInnerContent(meta.title) })
    .on('meta[name="description"]', { element: (el) => el.setAttribute('content', meta.description) });
  if (canonicalPath !== null) {
    const sandhurstExtras = canonicalPath === '/location/sandhurst' ? sandhurstHeadExtras(meta) : '';
    rewriter = rewriter.on('head', {
      element: (el) =>
        el.append(
          `<link rel="canonical" href="${SITE_ORIGIN}${canonicalPath}">${sandhurstExtras}`,
          { html: true },
        ),
    });
  }
  return rewriter.transform(response);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/health') {
        return json({
          status: 'ok',
          ghlConfigured: !!env.GHL_API_KEY,
          ghlHrConfigured: !!(env.GHL_HR_WEBHOOK_URL || env.GHL_CAREERS_WEBHOOK_URL || env.GHL_HR_API_KEY),
          resendConfigured: !!env.RESEND_API_KEY,
          ghlHrKeySet: !!env.GHL_HR_API_KEY,
          ghlHrApiVersion: 'v2',
        });
      }

      if (url.pathname === '/api/contact' && request.method === 'POST') {
        return await handleContact(request, env);
      }

      if (url.pathname === '/api/waitlist' && request.method === 'POST') {
        return await handleWaitlist(request, env);
      }

      if (url.pathname === '/go' || url.pathname.startsWith('/go/')) {
        return handleGoRedirect(url);
      }

      // Normalise trailing slashes for page-URL matching (/terms/ === /terms)
      const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;

      const redirectTarget = legacyRedirectTarget(path);
      if (redirectTarget) {
        // Merge incoming search into the target. Targets that already have a query
        // (e.g. /policies?section=terms) keep their own keys and gain gclid/UTMs.
        return Response.redirect(mergeIncomingSearch(redirectTarget, url.origin, url.searchParams), 301);
      }

      // Real files (JS/CSS/images, robots.txt, sitemap.xml) go straight to assets
      if (path.includes('.') || path.startsWith('/assets/')) {
        return env.ASSETS.fetch(request);
      }

      const meta = pageMetaFor(path);
      const assetResponse = await env.ASSETS.fetch(request);

      if (meta) {
        // Known page: inject its unique title, description and canonical URL
        return injectMeta(assetResponse, meta, path === '/' ? '/' : path);
      }

      // Unknown page: serve the SPA shell (which renders the 404 page) with a
      // real 404 status so search engines drop the URL
      const headers = new Headers(assetResponse.headers);
      headers.set('X-Robots-Tag', 'noindex');
      const notFound = new Response(assetResponse.body, { status: 404, headers });
      return injectMeta(notFound, {
        title: 'Page Not Found | Hoop Heroes',
        description: 'This page does not exist. Find your nearest Hoop Heroes youth basketball class on our homepage.',
      }, null);
    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: 'Internal server error' }, 500);
    }
  },
};
