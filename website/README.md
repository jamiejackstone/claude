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
  - `POST /api/contact` — careers forms → Hoop Heroes HR GHL sub-account; optional Resend email on top
  - `POST /api/waitlist` — "opening soon" waitlist leads → main GHL CRM (Oxford uses its dedicated inbound webhook). Tags are added with `POST /contacts/{id}/tags` after upsert so a repeat signup does not replace tags already on the contact.
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
npx wrangler secret put GHL_HR_API_KEY      # Hoop Heroes HR sub-account (careers form)
npx wrangler secret put GHL_API_KEY         # main GHL CRM Private Integration token (API v2; contacts.write + contacts.readonly)
npx wrangler secret put RESEND_API_KEY      # OPTIONAL: email notifications
```

(Or set the same values in the dashboard: **Worker → Settings → Variables and
Secrets**. When the Worker is deployed via Workers Builds / Git integration,
the dashboard is the natural place.) Optional plain variable `GHL_LOCATION_ID`
overrides the main location `9p0wEiLpTaIe1FDTFFQI`. `GET /api/health` reports
`ghlKeySet`, `ghlApiVersion` (`v2`), and `ghlLocationId`, and never the key.

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

### Email notifications (optional)

All form submissions land in GHL, so email pings are best configured as GHL
workflows (e.g. "tag `Franchise Enquiry` added → notify Jamie"). If Resend
email is wanted as well, set `RESEND_API_KEY` and verify
`notifications.hoopheroes.co.uk` in the [Resend dashboard](https://resend.com/domains);
emails send from `no-reply@notifications.hoopheroes.co.uk`. Without the key,
the Worker simply skips the email step.

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

## Live click-id test plan

Run this only after PR #5 and the click-id PR are merged into
`claude/website-recreation-hosting-ubxxtr`, Worker secret `GHL_API_KEY` is set,
and Jamie has said to run it. Do not run it before that. Use one probe contact
and delete it only with Jamie's OK.

Probe:

- Name: `ZZ Probe Click-ID`
- Email: `click-id-probe-YYYYMMDD@example.com` (use the day of the test)
- Phone: `+447700900000`
- Landing URL:
  `https://www.hoopheroes.co.uk/?gclid=TESTGCLID-YYYYMMDD&gbraid=TESTGBRAID-YYYYMMDD&wbraid=TESTWBRAID-YYYYMMDD`

Confirm the three custom fields on the main location `9p0wEiLpTaIe1FDTFFQI`:

- `hh_gclid` (`9frYn0xCQ45lkz4R6q0e`) = `TESTGCLID-YYYYMMDD`
- `gbraid` (`Vco6cxY4VKBWQ9FPB6rQ`) = `TESTGBRAID-YYYYMMDD`
- `wbraid` (`fMkXv33gXAGUuHBDcber`) = `TESTWBRAID-YYYYMMDD`

Native `contact.gclid` is not the field to check.

1. Open the landing URL in a private window. In devtools, confirm cookie
   `hh_click_ids` is present, `Secure`, `SameSite=Lax`, `Path=/`, and that its
   value contains the three ids as separate keys.
2. Waitlist. Open a coming-soon location from that same window (the URL should
   still show the click ids). Submit the waitlist form with the probe name,
   email and phone. In GHL, open the probe contact and confirm the three fields.
   Oxford uses the inbound webhook and then a v2 stamp; any other location uses
   upsert. Check both if you run two probes, with a different email for the
   second.
3. Careers. From the same browser, open `/careers` and submit an application
   with the probe details. The contact is created in the Hoop Heroes HR
   sub-account, not the main trial location. Confirm the three fields there.
4. Accident form. Open `/accident` and view the iframe URL. It should include
   `hh_gclid`, `gbraid` and `wbraid`. Submit only if Jamie wants a staff-form
   probe. The form stores values only for hidden fields that exist on that GHL
   form.
5. Chat widget. From the landing URL, open the LeadConnector chat widget and
   submit the probe name, email and phone. The widget reads `gclid`, `gbraid`
   and `wbraid` from the page URL. It does not write `hh_gclid` unless that
   chat widget's form in GHL has a hidden field with that key. Record whether
   the three custom fields are filled. That result decides if the widget form
   needs those hidden fields in GHL.
6. TeamUp. Click Book Free Taster. The TeamUp URL should include `gclid`.
   Finish a booking only with Jamie's OK, then check whether the GHL contact
   gained the three fields. Pre-capture (`POST /api/taster-click`, tag
   `website taster click`) stays off until `TASTER_PRECAPTURE` is `1` in the
   Worker and `TASTER_PRECAPTURE_ENABLED` is turned on in code.
7. Cleanup. Search GHL for `click-id-probe-YYYYMMDD@example.com` and delete
   that contact only after Jamie agrees. Do the same in the HR sub-account if
   the careers step was run.

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
