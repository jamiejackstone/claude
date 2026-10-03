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
6. TeamUp. Click Book Free Taster. The TeamUp URL may include `gclid`,
   `gbraid` and `wbraid` (that append is already live and is left as it is).
   Do not finish a booking for this probe, and do not expect `hh_gclid` on the
   GHL contact. Bookings and memberships reach GHL through classic Zapier Zaps
   (TeamUp trigger, then a LeadConnector contact upsert and tags; source
   `Zapier/TeamUp`). The taster also goes TeamUp to Google Calendar via a Zap,
   then into GHL by calendar sync. Those Zaps do not carry URL parameters, so
   the click id is dropped at TeamUp. The join for that route is Enhanced
   Conversions for Leads in Zapier, specified below. There is no site step
   before TeamUp.
7. Cleanup. Search GHL for `click-id-probe-YYYYMMDD@example.com` and delete
   that contact only after Jamie agrees. Do the same in the HR sub-account if
   the careers step was run.

## Enhanced Conversions for Leads (spec only)

Systems is building the TeamUp join in Zapier as Google Ads Enhanced
Conversions for Leads (ECfL). This section is a spec. It does not change GTM
or the Google tag. Do not add a `gtag` snippet, a `dataLayer` user-data push,
or an Ads customer id in this repo as part of that work.

### How the tag is loaded today

The site loads Google Tag Manager container `GTM-WBRDHQ5T` with the standard
snippet in [`index.html`](./index.html): the head script pushes `gtm.start`
onto `dataLayer` and loads `gtm.js`, and the body has the matching `noscript`
iframe. The live homepage HTML at `https://www.hoopheroes.co.uk/` matches that
snippet. The repo has no `gtag.js`, no `AW-` id, no `gtag('set', 'user_data')`,
and no Consent Mode v2 defaults (`ad_storage`, `analytics_storage`,
`ad_user_data`, `ad_personalization`). What the container itself fires is not
in the repo.

### Does ECfL need anything on the site?

No site code change is required for the Zapier upload Systems is building.
ECfL is turned on in Google Ads, not in this repository.

What Google does require, in Ads and in GTM:

- Accept the customer data terms and turn on enhanced conversions for leads,
  with the method set to Google Tag Manager. See
  [Configure Google Tag Manager for enhanced conversions for leads](https://support.google.com/google-ads/answer/11347292).
- If measurement were done with the Google tag directly (it is not: this site
  has no `gtag`), the tag settings would need automatic form-interaction
  collection, or an explicit `gtag('set', 'user_data', { email, phone_number })`
  before a `form_submit` event. Plain email and E.164 phone are allowed; Google
  hashes them. Pre-hashed values use hex SHA-256 under `sha256_email_address`
  and `sha256_phone_number`. See
  [Configure the Google tag for enhanced conversions for leads](https://support.google.com/google-ads/answer/11021502).
- The Google tag setting often labelled "Include user-provided data from your
  website" is that same enhanced-conversions switch. It lives in Google Ads or
  in the tag inside GTM. It is not a checkbox in this repo. Turning it on here
  would be a GTM publish, which this PR does not do.
- Automatic collection does not collect phone numbers. A waitlist or careers
  match that should include phone needs Manual (CSS) or Code (`dataLayer`)
  configuration in GTM.

### Which of our forms could send email or phone to the tag?

Only forms whose email and phone exist in the parent page DOM at submit time.

| Form | Where | Fields | When a tag could fire |
| --- | --- | --- | --- |
| Waitlist | Coming-soon location pages, `#waitlist` | `input[type=email]`, `input[type=tel]`, parent name | `handleWaitlistSubmit` in `pages/LocationMicrosite.tsx`. The handler calls `preventDefault` and `POST /api/waitlist`. There is no navigation. The form stays mounted until the request finishes, then it is replaced by the thank-you state. |
| Careers | `/careers` apply modal | `input[type=email]`, `input[type=tel]` | `handleSubmit` in `pages/Careers.tsx`. Same pattern: `preventDefault`, then `POST /api/contact` with `type: 'careers'`. The modal switches to thank-you after success. |

These handlers do not push `formSubmitted` or any user-data object onto
`dataLayer`. A GTM Form Submission trigger can still see the native `submit`
event, but Preview has to prove that, because the forms never navigate.

Out of reach of a parent-page tag:

- TeamUp bookings and memberships. The email is entered on `goteamup.com`.
- The accident form. It is a cross-origin GHL iframe
  (`link.halomarketinghub.com`). The parent page cannot read its fields.
- The LeadConnector chat widget. It runs in its own frame and today only
  receives the page URL.
- The location `wa.me` link and the unmounted `WhatsAppWidget`. Neither is a
  lead form with email and phone.
- There is no separate contact form. `/contact` redirects home.

### Minimum GTM change

For Systems or Jamie, in container `GTM-WBRDHQ5T`. Do not do this from the repo.

1. In Google Ads, open Goals, then Settings. Turn on enhanced conversions for
   leads and choose Google Tag Manager. Accept the customer data terms if they
   are not already accepted. If conversions are tracked by a manager account,
   accept the terms there.
   Source: [GTM setup, "Accept Customer data terms"](https://support.google.com/google-ads/answer/11347292).
2. In GTM, if a Conversion Linker tag is missing, add one. Tag type Conversion
   Linker. Trigger: All Pages. Save. Do not publish yet.
3. Create a User-Provided Data variable. Type: Manual. Map Email to a DOM
   Element variable whose CSS selector is `input[type="email"]`. Map Phone to
   a DOM Element variable whose CSS selector is `input[type="tel"]`. Leave the
   attribute name blank. Do not use Automatic: Google's automatic method does
   not collect phone numbers.
4. Create a tag. Type: Google Ads User-Provided Data Event. Conversion ID: the
   Google Ads customer id (not in this repo). User-provided data: the variable
   from step 3.
5. Trigger: Form Submission, limited to the waitlist form and the careers
   apply form (or All Forms if Preview shows no other forms submit email).
   The trigger must be the submit itself, while the inputs are still on the
   page, not the thank-you state that replaces them.
6. Add a consent exception so this tag fires only after the visitor has
   accepted cookies. The site already pushes `cookie_consent_accepted` and
   `cookie_consent_rejected` on `dataLayer` from `components/CookieConsent.tsx`.
   There is no Consent Mode v2 in the page, so the tag needs its own consent
   check inside GTM.
7. Preview. Submit the waitlist form and the careers form. The User-Provided
   Data Event tag must be under Tags Fired, and the tag detail must show the
   email and phone. If the tag is under Tags Not Fired, the React
   `preventDefault` path is blocking the Form Submission trigger.
8. Only if Preview fails: stop and ask for a site change. The follow-up would
   push `dataLayer` after a successful Worker response, with event
   `formSubmitted` and `leadsUserData.email` plus `leadsUserData.phone_number`
   in E.164, then a User-Provided Data variable of type Code pointing at
   `leadsUserData`. That push is not in this PR. Google's example is in the
   same GTM article, under code configuration.
9. Publish the container only after Preview shows hashed user data on the
   `https://google.com/pagead/form-data/` request.

### TeamUp bookings, which happen off-site

ECfL can match an offline upload of hashed email or phone to signed-in Google
accounts that engaged with the ad, without the website tag having seen that
email. Google describes the match as two paths: data the website tag collected
at lead time, and signed-in customers who engaged with the ad.
[About enhanced conversions for leads](https://support.google.com/google-ads/answer/15713840).

The website-tag path does not exist for a TeamUp-only booking. The booking
email is never submitted on hoopheroes.co.uk, so a site tag cannot collect it.
The signed-in path is the one Zapier can feed: hash the TeamUp email and phone
and upload them. The Google Ads API guide says that if you do not plan to use
the Google tag, skip tagging and implement the upload.
[Manage offline conversions](https://developers.google.com/google-ads/api/docs/conversions/upload-offline).
Normalize, then SHA-256. For `gmail.com` and `googlemail.com`, lowercase, trim,
and remove dots and the plus-suffix in the local part before hashing. Phone
must be E.164.

GCLID is still required on the upload when you are not using a tag to collect
user-provided data for that lead
([About ECfL](https://support.google.com/google-ads/answer/15713840),
[GTM setup](https://support.google.com/google-ads/answer/11347292),
[Google tag setup](https://support.google.com/google-ads/answer/11021502)).
The TeamUp Zaps do not carry URL parameters, so they do not have a gclid.
Appending click ids to TeamUp links does not fix that. A site tag is optional
for the signed-in match and cannot create the website-form match for these
bookings. From 15 June 2026, offline and ECfL uploads move to the Data Manager
API; Zapier needs to follow that cutover
([About ECfL](https://support.google.com/google-ads/answer/15713840)).

### Consent and privacy (flag only)

No policy copy is changed here.

- A hashed email or phone is still personal data under UK GDPR. Sending it to
  Google for ad measurement needs a lawful basis and a privacy-notice line.
  The current privacy copy does not mention hashed lead data or Google Ads
  enhanced conversions.
- PECR requires consent before a non-essential tag stores or reads information
  on the device, or sends user-provided data for advertising. The cookie policy
  says GTM and Meta only activate on Accept. The GTM snippet in `index.html`
  loads on every page before a choice. Meta PageView is gated on Accept.
  ECfL's user-provided-data tag must not fire before Accept.
- Google says the consent field on the upload is highly recommended, and that
  leaving it empty may make conversions unattributable. Zapier should set it
  from the banner choice. This site has no Consent Mode v2 signals to copy.
- Do not send a child's email or phone. The waitlist name field is the parent.
  Careers is an adult applicant. TeamUp's own account email is whatever the
  booker typed on TeamUp.

Checklist for the upload side:
[Enhanced conversions for leads implementation checklist](https://support.google.com/google-ads/answer/16782203).
Upgrade path from plain offline import:
[Upgrade offline conversion imports](https://support.google.com/google-ads/answer/14274408).

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
