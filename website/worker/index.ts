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

// POST /api/contact — coaching applications into the Hoop Heroes HR GHL
// sub-account. Resend email is an optional extra that only runs when
// RESEND_API_KEY is configured.
async function handleContact(request: Request, env: Env): Promise<Response> {
  const { type, name, email, phone, location, about, role } = await request.json() as Record<string, string>;

  let delivered = false;

  if (type === 'careers') {
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
    const name = LOCATION_NAMES[path.split('/')[2] || ''];
    if (name) {
      return {
        title: `Kids Basketball Classes in ${name} | Hoop Heroes`,
        description: `Youth basketball classes for ages 5-15 in ${name}. Weekly sessions with qualified coaches — book your free taster session at Hoop Heroes ${name} today.`,
      };
    }
  }
  return null;
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
    rewriter = rewriter.on('head', {
      element: (el) => el.append(`<link rel="canonical" href="${SITE_ORIGIN}${canonicalPath}">`, { html: true }),
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

      if (LEGACY_REDIRECTS[path]) {
        const target = LEGACY_REDIRECTS[path];
        const dest = new URL(target, url);
        if (!target.includes('?') && url.search) {
          dest.search = url.search; // keep UTM params etc. when the target has no query of its own
        }
        return Response.redirect(dest.toString(), 301);
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
