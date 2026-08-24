---
name: hh-website
description: Make any update to the Hoop Heroes website (hoopheroes.co.uk) — class times, coaches, locations, photos, copy, pages, the 3x3 Gameday details, SEO files or the form API — by editing the code in the jamiejackstone/claude GitHub repo and pushing, which auto-deploys via Cloudflare. Use this EVERY time Jamie asks for a website change, however small — phrasings like "update the website", "change the class times on the site", "new coach at Marlow", "add [town] as a new location", "swap that photo", "the gameday date has changed", "edit the site", "take that page down", or any request that is plainly about what visitors see on hoopheroes.co.uk, even when he doesn't say "website". Also use it to diagnose website issues ("the site looks broken", "the careers form isn't working"). Do NOT use for GHL configuration (hh-ghl-agent-brief), printed artwork (hh-print-artwork), or Meta ads (hh-fb-ads).
---

# Hoop Heroes Website Updates

The Hoop Heroes website is code in a GitHub repo. Editing the code and pushing
it is the ONLY way the site changes — there is no admin panel or CMS. Cloudflare
rebuilds and deploys automatically on every push, live in ~2–3 minutes.

## Where everything lives (live values — trust these over memory)

| Thing | Value |
|---|---|
| Repo | `jamiejackstone/claude`, site in the `website/` folder |
| Deploy branch | `claude/website-recreation-hosting-ubxxtr` — pushes here auto-deploy; NEVER push website changes anywhere else |
| Hosting | Cloudflare Worker `hoop-heroes-website` (account `jamie-667`), built by Workers Builds: root `website`, build `npm run build`, deploy `npx wrangler deploy` |
| Live URLs | https://www.hoopheroes.co.uk and https://hoopheroes.co.uk (preview: https://hoop-heroes-website.jamie-667.workers.dev) |
| Stack | React 18 + Vite + Tailwind (compiled at build time) + a Cloudflare Worker for the API (`website/worker/index.ts`) |

**This skill needs a Claude Code session with the repo.** If invoked somewhere
without repo access (e.g. a Cowork chat), don't attempt the edit — tell Jamie to
open claude.ai/code on `jamiejackstone/claude` and repeat the request there, or
hand the task to such a session yourself if session-creation tools are available.

## Content map — what to edit for common requests

- **Location details** (address, class times, coach, photos, reviews, booking
  links, notices): `website/constants.ts` — one `LocationData` entry per
  location. The navbar, homepage cards and location pages all render from it.
- **3x3 Gameday details** (date, venue, cost, registration link): the
  `settings` object at the top of `website/pages/Gameday.tsx`.
- **Page copy / layout**: `website/pages/*.tsx` (Home, Mission, Careers,
  Policies, Gameday, AccidentReport, LocationMicrosite) and shared parts in
  `website/components/` (Navbar, Footer, CookieConsent, WhatsAppWidget).
- **SEO**: `website/public/sitemap.xml` and `website/public/robots.txt`.
  Canonical URLs use `https://www.hoopheroes.co.uk`.
- **QR short links** (`/go/<slug>` on printed banners/flyers): slug lists in
  BOTH `website/worker/index.ts` (`VALID_GO_SLUGS`) and
  `website/pages/GoRedirect.tsx`.
- **Form API**: `website/worker/index.ts`. Careers applications → "Hoop Heroes
  HR" GHL sub-account (location `zxMh9T37AzC9DytMDQGr`) via the
  `GHL_HR_API_KEY` secret. "Opening soon" waitlist leads → main CRM sub-account
  (location `9p0wEiLpTaIe1FDTFFQI`) via `GHL_API_KEY`; Oxford has a hard-coded
  inbound webhook. Resend email is optional (`RESEND_API_KEY`).

## The update loop (every change, however small)

1. `cd website && npm install` (first time in a session), make the edit.
2. **Verify before pushing** — `npm run build` must pass (it typechecks too).
   For visual changes, run `npx wrangler dev` and screenshot the affected pages
   with Playwright (`/opt/pw-browsers` chromium); external images/fonts are
   blocked in the sandbox, so judge layout and text, not photos.
3. Commit with a clear message and `git push -u origin claude/website-recreation-hosting-ubxxtr`.
4. Tell Jamie it will be live in ~2–3 minutes and name the exact URL(s) to
   check. The sandbox CANNOT reach workers.dev or the Cloudflare API (egress
   policy), so Jamie's browser is the live verification — never claim to have
   verified the live site yourself.

## Checklist: adding a new location

1. Add the `LocationData` entry in `constants.ts` (copy a similar location).
   New-but-not-open locations get `comingSoon: true`, a `ghlTag` like
   `"Bracknell Earlybird"`, and show a waitlist form instead of booking.
2. Add the slug to `VALID_GO_SLUGS` in `worker/index.ts` AND `GoRedirect.tsx`.
3. Add a `/<slug>` → `/location/<slug>` redirect route in `App.tsx` (and its
   hash-map entry).
4. Add the location URL to `public/sitemap.xml`.
5. TeamUp booking URL needs the venue ID filter:
   `https://goteamup.com/p/6822945-hoop-heroes/c/schedule?venues=<id>` (ask
   Jamie for the TeamUp venue ID if unknown).
6. Remind Jamie of the wider four-step new-location sequence in
   hh-print-artwork (website → GHL → artwork → print) — this skill only covers
   the website step.

## Cloudflare dashboard tasks (secrets, domains, build settings)

The sandbox cannot reach Cloudflare's API, so anything in the Cloudflare
dashboard (adding Worker secrets under Settings → Variables and Secrets,
custom domains, changing build settings) is done by Jamie — usually via a
Claude in Chrome prompt. Write him a precise numbered prompt naming exact
menu paths and exact secret names. GHL API keys come from
https://crm.rallyai.co.uk/ → (correct sub-account) → Settings → Business
Profile → API Key.

## Guardrails

- Never commit secrets or API keys into the repo.
- Never reintroduce Firebase — the old Firebase project is dead; all content
  is code.
- Don't change Worker route paths (`/api/*`, `/go/*`) without checking the
  pages that call them.
- UK English in all site copy.
- For anything beyond a small edit (new page, redesign, new integration),
  agree the plan with Jamie first (hh-plan-first).
