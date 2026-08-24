# Hoop Heroes Website

The Hoop Heroes multi-location platform — central hub plus microsites for every
location, with class schedules, free-taster booking, careers and franchise
enquiry forms.

Rebuilt from the Google AI Studio export to run entirely on **Cloudflare
Workers** (static site + API in one deployment, free tier is plenty). The
suspended Google/Firebase project is no longer needed: all location content
lives in [`constants.ts`](./constants.ts), and the form API talks directly to
GoHighLevel and Resend.

## Stack

- **React 18 + Vite + Tailwind CSS** (compiled at build time — no CDN scripts)
- **Cloudflare Worker** ([`worker/index.ts`](./worker/index.ts)) serving:
  - `POST /api/contact` — franchise & careers forms → Resend email + HR GHL sub-account sync
  - `POST /api/waitlist` — taster/waitlist leads → GHL CRM (Oxford uses its dedicated inbound webhook)
  - `GET /go/:slug` — QR-code short links for printed banners/flyers (adds UTM tags)
  - `GET /api/health` — config check
  - Everything else → static SPA assets

## Local development

```bash
npm install
npm run dev        # UI only (Vite, no API) — http://localhost:5173
npm run preview    # Full build + Worker with API — http://localhost:8787
```

To test forms locally, copy `.dev.vars.example` to `.dev.vars` and fill in the
keys (never commit `.dev.vars`).

## Deploying

One-time setup:

```bash
npx wrangler login                          # sign in to Cloudflare
npx wrangler secret put RESEND_API_KEY      # email notifications
npx wrangler secret put GHL_API_KEY         # main GHL account (waitlist leads)
npx wrangler secret put GHL_HR_WEBHOOK_URL  # HR & Recruitment sub-account
```

Then every deploy is:

```bash
npm run deploy
```

This builds the site and publishes it to
`hoop-heroes-website.<your-account>.workers.dev`.

### Pointing hoopheroes.co.uk at it

1. Add `hoopheroes.co.uk` as a site in the Cloudflare dashboard (if its DNS
   isn't already on Cloudflare, update the nameservers at your registrar).
2. In **Workers & Pages → hoop-heroes-website → Settings → Domains & Routes**,
   add custom domains `www.hoopheroes.co.uk` and `hoopheroes.co.uk`.
3. Done — SSL certificates are issued automatically.

### Resend domain

Emails send from `no-reply@notifications.hoopheroes.co.uk`. The
`notifications.hoopheroes.co.uk` domain must be verified in the
[Resend dashboard](https://resend.com/domains) (it was already verified for the
old site; if you created a fresh Resend account, re-add the DNS records it
gives you).

## Updating content

There is no admin panel any more — content is edited in code, which keeps the
site free of external databases:

- **Locations** (addresses, coaches, class times, booking links, reviews):
  edit [`constants.ts`](./constants.ts)
- **3x3 Gameday details**: edit the `settings` object at the top of
  [`pages/Gameday.tsx`](./pages/Gameday.tsx)
- **Sitemap**: [`public/sitemap.xml`](./public/sitemap.xml) — add new
  locations here too

After editing, run `npm run deploy`.

## Changes from the AI Studio export

- Removed Firebase/Firestore entirely (project was suspended; the site always
  had full fallback data in `constants.ts`). The `/admin` page is gone —
  `/admin` now redirects to the homepage.
- Replaced the Express server (`server.ts`) with a Cloudflare Worker — same
  endpoints and behavior.
- Tailwind is now compiled at build time instead of loaded from the CDN
  (faster, and production-supported).
- Removed AI Studio leftovers: the `aistudiocdn.com` import map, the unused
  reCAPTCHA script tag, and Netlify/Docker/nginx config stubs.
- Everything else — pages, styling, tracking (GTM, Meta Pixel, GHL), chat
  widget, booking links, SEO redirects — is unchanged.
