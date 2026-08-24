// Cloudflare Worker serving the Hoop Heroes API alongside the static SPA assets.
// Replaces the previous Express server (server.ts) from the AI Studio export.

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

// Create a contact via the GHL v1 REST API. Returns true on success.
async function createGhlContact(apiKey: string, payload: Record<string, unknown>, label: string): Promise<boolean> {
  const response = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    console.error(`[${label}] GHL API Error:`, response.status, await response.text());
    return false;
  }
  return true;
}

// POST /api/contact — Franchise enquiries & coaching applications.
// Leads land in GHL (the system of record); Resend email is an optional extra
// that only runs when RESEND_API_KEY is configured.
async function handleContact(request: Request, env: Env): Promise<Response> {
  const { type, name, email, phone, location, about, role } = await request.json() as Record<string, string>;

  let subject = '';
  let html = '';
  let delivered = false;

  if (type === 'franchise') {
    if (!env.GHL_API_KEY) {
      return json({
        error: 'CRM Configuration Error',
        details: 'GHL_API_KEY is missing. Set it in the Worker settings.',
      }, 500);
    }

    const { firstName, lastName } = splitName(name);
    delivered = await createGhlContact(env.GHL_API_KEY, {
      firstName,
      lastName,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: normalizePhone(phone),
      tags: ['Franchise Enquiry', 'Source: Website Franchise Form'],
      source: location || 'Website Franchise Page',
    }, 'Franchise');

    subject = `New Franchise Enquiry: ${name}`;
    html = `
      <h1>New Franchise Enquiry</h1>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p><strong>Source:</strong> ${escapeHtml(location || 'Franchise Page')}</p>
    `;
  } else if (type === 'careers') {
    // Coaching applications go to the HR & Recruitment GHL sub-account
    const { firstName, lastName } = splitName(name);
    const careerPayload = {
      firstName,
      lastName,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: normalizePhone(phone),
      tags: ['coach', 'recruitment', role.toLowerCase().replace(/\s+/g, '_'), role],
      source: 'Website HR & Recruitment Form',
      notes: about,
      nearest_hh_location: location,
      role_applied: role,
      sub_account: 'HR & Recruitment',
    };

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
      }
    } else if (env.GHL_HR_API_KEY) {
      delivered = await createGhlContact(env.GHL_HR_API_KEY, careerPayload, 'HR Sub-Account');
    } else {
      return json({
        error: 'CRM Configuration Error',
        details: 'GHL_HR_WEBHOOK_URL or GHL_HR_API_KEY is missing. Set one in the Worker settings.',
      }, 500);
    }

    subject = `New Careers Application: ${role} - ${name}`;
    html = `
      <h1>New Careers Application</h1>
      <p><strong>Role:</strong> ${escapeHtml(role)}</p>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p><strong>Preferred Location:</strong> ${escapeHtml(location)}</p>
      <p><strong>About:</strong></p>
      <p>${escapeHtml(about)}</p>
    `;
  } else {
    return json({ error: 'Invalid enquiry type' }, 400);
  }

  // Optional email notification — never fails the submission if it errors
  if (env.RESEND_API_KEY) {
    const toEmail = type === 'franchise' ? 'franchise@hoopheroes.co.uk' : 'careers@hoopheroes.co.uk';
    try {
      await sendResendEmail(env, { to: toEmail, subject, html, replyTo: email });
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
  const { name, email, phone, tags, source, locationName } = await request.json() as Record<string, any>;

  const { firstName, lastName } = splitName(name);
  const leadPayload = {
    firstName,
    lastName,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: normalizePhone(phone),
    tags: Array.isArray(tags) ? tags : [tags],
    source,
    locationName,
  };

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
    return json({ success: true, message: `Lead sent to ${locationName} webhook` });
  }

  if (!env.GHL_API_KEY) {
    console.error('GHL_API_KEY is not configured');
    return json({
      error: 'CRM Configuration Error',
      details: 'GHL_API_KEY is missing. Set it with: wrangler secret put GHL_API_KEY',
    }, 500);
  }

  const ghlResponse = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GHL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(leadPayload),
  });

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

// GET /go/:slug — QR code short redirects for printed banners & flyers
const VALID_GO_SLUGS = [
  'aylesbury',
  'great-missenden',
  'holmer-green',
  'bicester',
  'wendover',
  'oxford',
  'marlow',
  'tring',
  'sandhurst',
];

function handleGoRedirect(url: URL): Response {
  const rawSlug = (url.pathname.split('/')[2] || '').toLowerCase().trim();
  if (!rawSlug || !VALID_GO_SLUGS.includes(rawSlug)) {
    return Response.redirect(new URL('/', url).toString(), 302);
  }

  const src = url.searchParams.get('src');
  const utmSource = src === 'banner' ? 'banner' : src === 'flyer' ? 'flyer' : 'print';

  const destination = new URL(
    `/location/${rawSlug}?utm_source=${utmSource}&utm_medium=print&utm_campaign=sep26&utm_content=${rawSlug}`,
    url,
  );
  return Response.redirect(destination.toString(), 302);
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

      // Everything else: static assets with SPA fallback (configured in wrangler.jsonc)
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: 'Internal server error' }, 500);
    }
  },
};
