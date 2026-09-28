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
  - `POST /api/waitlist` — "opening soon" waitlist leads → main GHL CRM (Oxford uses its dedicated inbound webhook)
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
npx wrangler secret put GHL_HR_API_KEY      # HR sub-account Private Integration token (API v2; contacts.write + contacts.readonly)
npx wrangler secret put GHL_API_KEY         # main GHL CRM (only for "opening soon" waitlists; still API v1 on this branch)
npx wrangler secret put RESEND_API_KEY      # OPTIONAL: email notifications
```

`GHL_HR_API_KEY` must be a Private Integration token created on the Hoop Heroes
HR sub-account, not the legacy Business Profile API key and not the
main-location token. Location `zxMh9T37AzC9DytMDQGr` is verified in GHL as
**Hoop Heroes HR**, timezone Europe/London. Careers writes use API v2
(`https://services.leadconnectorhq.com`, `Version: 2021-07-28`):
`POST /contacts/upsert` with that `locationId`, then `POST /contacts/{id}/tags`
and, when there is text to store, `POST /contacts/{id}/notes` with
`{"body":"..."}`. Tags are not sent on the upsert, because an upsert replaces
every existing tag. A failed tag or note call is logged and does not fail the
application. `sub_account` is not sent. `GET /api/health` reports `ghlHrKeySet`
and `ghlHrApiVersion` (`v2`) and never the key.

HR custom fields on the upsert:

| Form value | GHL field | id | key sent |
| --- | --- | --- | --- |
| Preferred location | Coaching Location(s) (`contact.preferred_location`, multiple options) | `xTVtfVcxCcLKDslvR5AY` | `preferred_location` |
| Role | Coach: Role (`contact.role`, single option) | `U1NmOQc8eMon4gyVHvAj` | `role` |

Allowed locations, matched exactly after the free-text value is split, trimmed,
and compared case-insensitively: Aylesbury, Wendover, Tring, Marlow, Holmer
Green, Great Missenden, Bicester, Oxford, Sandhurst. Unknown values are logged
and dropped. If none match, the field is left out. `fieldValue` is an array.

Coach: Role mapping from the buttons in [`pages/Careers.tsx`](./pages/Careers.tsx):

| Form `role` | Sent as |
| --- | --- |
| Head Coach | Head Coach |
| Assistant Coach | Assistant Coach |
| Volunteer Coach | not sent — no matching option. The note gains `Role applied (unmapped): Volunteer Coach` |
| Junior Assistant Coach | Junior Assistant Coach (allowed value; the form has no button for it) |
| Head Coach in Training | Head Coach in Training (allowed value; the form has no button for it) |

Volunteer Coach is left unmapped on purpose. Its job description covers parents,
DofE candidates, and junior assistants, so it is not stored as Junior Assistant
Coach. The about answer is the contact note. An unmapped role is appended on
the next line. The notes call is skipped when both are empty.

Click-id custom fields (`hh_gclid`, `gbraid`, `wbraid`) still use the field ids
verified on the main location. If the HR sub-account returns 400 or 422, the
Worker retries the upsert without custom fields, then still adds the tags and
the note.

(Or set the same values in the dashboard: **Worker → Settings → Variables and
Secrets**. When the Worker is deployed via Workers Builds / Git integration,
the dashboard is the natural place.)

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
