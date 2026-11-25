# Handover: Hero Dome website and enquiry form

Written 25 November 2026 for a new Claude Code thread. Read this first, then the files it points to.

## 1. The goal of the new thread

Get a Hero Dome page live on the Hoop Heroes website, with a working enquiry form whose submissions go straight to Christie Lothamer (Schools and Hero Dome Lead; her work email is on the deck's last slide) to follow up.

This page becomes the main asset for promoting the Hero Dome and getting the word out.

Done looks like:
1. A Hero Dome page on hoopheroes.co.uk (planned address: hoopheroes.co.uk/hero-dome).
2. An enquiry form on it that (a) creates or updates the contact in the main GoHighLevel (GHL) account with a Hero Dome tag and (b) emails Christie the details.
3. A test enquiry sent end to end and confirmed by Christie.
4. Jamie has approved the page before it goes live.

## 2. Who you are working with

Jamie Stone, Founder and MD of Hoop Heroes (Hoop Heroes Region 1 Ltd), a children's basketball coaching company in the UK.

How Jamie likes to work:
- Concise and direct, UK English, recommendation first.
- Multiple-choice options rather than open questions.
- One clear next step at a time. Jamie has ADHD and likes small wins.
- Push back honestly; flag risks and uncertainty.
- Show drafts before anything is sent, saved to Drive or published.
- "The KB" is the shared Google Drive "Hoop Heroes Knowledge Base". Read from it; never write back into it.

## 3. Where everything is

### Repository: jamiejackstone/claude

Two branches matter.

| Branch | What is on it | Rules |
|---|---|---|
| `claude/basketball-court-3d-viz-ssmdil` | All Hero Dome work: 3D concept, renders, decks, microsite draft, finance model, this handover | Commit and push freely |
| `claude/website-recreation-hosting-ubxxtr` | The live hoopheroes.co.uk website, in `website/` | **Deploy branch. Do not push or deploy without Jamie's explicit OK.** Other agents (Cursor) also merge PRs here, so pull first |

Fetch both: `git fetch origin claude/basketball-court-3d-viz-ssmdil claude/website-recreation-hosting-ubxxtr`.

Hero Dome files on `claude/basketball-court-3d-viz-ssmdil`:

| What | Path |
|---|---|
| Microsite draft (the starting point for the page) | `court-viz/business/microsite-draft/heroes-arena.html` and `court-viz/business/microsite-draft/img/` |
| Schools pitch deck, text version (best single summary of the offer) | `court-viz/business/schools-deck/Hero Dome school pitch deck (text).md` |
| Schools deck source (slides as HTML) | `court-viz/business/schools-deck/project/` |
| Concept stills, 4K | `court-viz/renders/hero-dome/` (HD 01 to HD 13) |
| 3D concept, single file | `court-viz/deliverables/Hero Dome Concept.html` (multi-sport) and `Hero Dome Basketball Concept.html` (basketball-led) |
| Floor markings plans | `court-viz/renders/floor/` |
| Finance model and internal finance pack | `court-viz/business/finance/`, `court-viz/business/finance-pack/` (internal only, never on the public page) |

### Published pages (claude.ai)

| What | Link | Shared? |
|---|---|---|
| Microsite draft | https://claude.ai/artifact/VaM7uHRgM4AcYK5QbcwSGg | Anyone with the link |
| Schools pitch deck (18 slides) | https://claude.ai/artifact/BExeLhW8PQoN2oUELP81Ly | Anyone with the link |
| 3D concept, multi-sport | https://claude.ai/artifact/8vA8bnSnsFfczJXxV82EhW | Anyone with the link |
| 3D concept, basketball-led | https://claude.ai/artifact/S7HqRkXtnKf7BrCVUajMaX | Private until Jamie shares it |
| School outreach email templates | https://claude.ai/artifact/PQ3P9btPDWWnugfQGqWcCz | Check sharing |
| Finance pack (internal) | https://claude.ai/artifact/Ui8SRQBpQLw9hMYuW1RRc6 | Internal only |

### Google Drive (Jamie's My Drive, not the KB)

- "Hero Dome target schools" (Google Sheet). Search Drive by that title.

### In the KB (read only)

- "Heroes Arena — Decision Log v0.1". Search Drive by that title.
- "Hero Dome - Head teacher concerns & our answers v0.1 DRAFT". Search Drive by that title.

## 4. The website, technically

- `website/` on `claude/website-recreation-hosting-ubxxtr`: React 18 + Vite + Tailwind, pre-rendered, served by a Cloudflare Worker (`website/worker/index.ts`, config `website/wrangler.jsonc`). Read `website/README.md` first.
- Scripts: `npm run dev`, `npm test` (includes a build and pre-render check), `npm run deploy` (`wrangler deploy`). Deploying needs Cloudflare credentials, which this container does not have; Jamie may need to deploy, or add a Cloudflare API token through the environment's credential form.
- Brand on the site: Lilita One headings, Montserrat body, navy `#14264e`, gold `#fba91a`, "sticker" shadows. Hero Dome sport colours: basketball gold, pickleball green `#9bd13b`, dodgeball red `#e63950`.
- Existing form endpoints in the Worker, to copy:
  - `POST /api/waitlist`: taster and waitlist leads into the **main GHL location** (its ID is in the Worker code) through the v2 API, with tags added after the upsert.
  - `POST /api/contact`: coaching applications into the HR GHL account, plus an email through **Resend** (`sendResendEmail`) to the careers inbox.
- The API keys live in Cloudflare, not in the repo. See `website/.dev.vars.example` for their names.

### Suggested build for the enquiry form

Recommended: a new `POST /api/hero-dome-enquiry` endpoint, modelled on the two above:
1. Upsert the contact into the main GHL location, then add tags such as `hero-dome` and `hero-dome-enquiry`, with the organisation and role in the notes or custom fields.
2. Email Christie the enquiry through Resend (reply-to set to the person who enquired).
3. Return a clear thank-you message on the page.
4. Spam protection: a honeypot field at minimum; Cloudflare Turnstile if Jamie wants it.
5. Tests alongside the existing ones (see `worker/ghlV2.test.ts`).

Suggested form fields, for Jamie to confirm: name, role (head, business manager, governor, PE lead, council, club, other), organisation, town or postcode, email, phone (optional), "Tell us about your site" (free text), how they heard about it, and a privacy consent tick box.

## 5. What the Hero Dome is (decided)

- **Name:** Hero Dome. Strap line: "Your home court". It was previously called Heroes Arena, Hoop Hub and Heroes Hub; the KB Decision Log still says Heroes Arena (29-1), but Jamie renamed it Hero Dome on 4 November 2026.
- **What it is:** a covered, enclosed multi-sport court on a school playground: a steel-framed fabric arched canopy (17 m span × 12.19 m long) on shipping containers, over a tiled 14.8 × 10 m court. Reception and viewing area with an accessible WC on one side, kit storage on the other. Roller door and a fire exit; both ends closed. Covered and LED lit.
- **Sports:** basketball first (mini court and 3x3, wheelchair basketball), with pickleball and dodgeball line markings. Hoop Heroes runs all three itself.
- **The offer to schools:** installed, equipped and run by Hoop Heroes at £0 to the school. The school day is the school's; Hoop Heroes runs its sessions outside school hours. We handle and pay for planning. School provides power; we sub-meter it.
- **Headline terms:** 5 years, option to renew for 5 more; break with 12 months' notice any time after year 3; annual review; removal and make good at the end. Rent none or nominal.
- **Areas, in order:** Aylesbury and Wendover, then Bicester, then the High Wycombe area (Marlow, Great Missenden, Holmer Green). One Dome per area.
- **Process:** discovery call, site visit, agree in principle (non-binding letter and governors' pack), planning and consents, install in the school holidays, open.
- **Contacts on materials:** Jamie Stone, Founder; Christie Lothamer, Schools and Hero Dome Lead. Their work emails are on the deck's last slide.
- **Hoop Heroes facts:** 400+ children aged 5 to 15 a week, 9 locations across Bucks, Oxfordshire, Herts and Berkshire, since 2018. Coaches DBS checked and Basketball England safeguarding accredited.

## 6. Never put these on a public page

From the KB sheet "Head teacher concerns & our answers v0.1":
- No install or opening dates.
- No money figures for what a school saves or gets. No "worth over £50,000".
- No promise that a school will be the first or only site. No "founding school" extras.
- No numbers of free sessions or community hours.
- No "no digging or building work": the accessible WC needs water and drainage.
- Don't say it is a CIC. Whether Dome #1 runs through Hoop Heroes Region 1 Ltd or another body is open.
- School-day use (PE, break, wet play, lunch, clubs) is still undecided. Say only "the school day is yours".
- No children's names or photos.
- Nothing from the internal finance pack or model.

### The microsite draft needs these fixes before it is reused

`court-viz/business/microsite-draft/heroes-arena.html` predates the concerns sheet. Fix:
- Line 130 area: "No digging or building work".
- Line 265 area: "A covered sports arena worth over £50,000".
- Line 274 area: "No digging or foundations".
- Line 295 area: "No digging, no concrete, no building work".
- Any "PE, break, lunch and clubs" wording, any "founding school" or 2027 wording, and "about a week" install timing.
- The deck (link above) already has the corrected wording to copy.

## 7. Open questions for Jamie (ask one at a time, as multiple choice)

1. Public page linked from the site menu, or unlisted (link only) for now?
2. Address: hoopheroes.co.uk/hero-dome?
3. Who gets each enquiry: Christie only, or Christie with Jamie copied?
4. Should GHL also start a workflow or pipeline stage for Hero Dome enquiries, or just tag the contact?
5. Confirm the form fields and the privacy wording.
6. Which visuals: stills only, or an embedded 3D concept as well?
7. Does the deck PDF go on the page as a download? (Jamie removed downloads from the microsite on 4 November.)

## 8. Working rules for this repository

- Commit to `claude/basketball-court-3d-viz-ssmdil` freely. Commit messages end with the attribution lines the session gives you.
- Never push to `claude/website-recreation-hosting-ubxxtr` or deploy without Jamie's explicit OK. Pull first; other agents merge there.
- Don't open a pull request unless Jamie asks.
- Don't send emails or save to Drive without showing Jamie a draft first.

## 9. Decisions from Jamie (25 November 2026)

1. **Visibility:** unlisted for now. Live page, not in the menu or sitemap, `noindex`. Add to the menu once Christie confirms an end-to-end test.
2. **Address:** hoopheroes.co.uk/hero-dome.
3. **Enquiry email:** to Christie, Jamie cc'd. Reply-to is the person who enquired.
4. **GHL:** a new "Hoop Heroes – Schools" sub-account (Jamie to create). Use Companies for schools inside it. Tags `hero-dome` and `hero-dome-enquiry`; no pipeline or workflow yet. The Worker reads the location ID and API key from their own settings, so the target account can change without a code change. The main GHL account is not used for school contacts.
5. **Form fields:** the handover set (section 4) as it stands. Privacy tick box: "I'm happy for Hoop Heroes to contact me about the Hero Dome. We'll only use these details for this enquiry; see our privacy policy." (link to /policies).
6. **Visuals:** concept stills plus one video of about 60–75 seconds, made from the multi-sport 3D concept and playing muted on a loop on the page (changed 25 Nov from an embedded 3D viewer). The installation comes first: empty playground, services and groundwork, containers arrive, canopy goes up, court laid, doors open. The tour follows: outside, door up, reception, basketball, 3x3, wheelchair 3x3, pickleball, dodgeball, end card. No timings or dates on screen, and nothing suggesting there is no groundwork (the WC needs drainage). Reuse the installation tooling behind `renders/video/hoop-hub-installation.mp4`. Adapt `tools/assemble_video.py`. An optional "Explore the 3D concept" link may stay.
7. **Deck PDF:** not on the page. Christie sends it after first contact.

## 10. Status (25 November 2026)

- Merged to `claude/website-recreation-hosting-ubxxtr` with Jamie's OK (commits e1c5c76, 2e44747, 62118c7): `/hero-dome` page, `POST /api/hero-dome-enquiry`, the 57-second video (`public/video/hero-dome.mp4`), and the page as a standalone landing page with no site menu or footer.
- Video source: `court-viz/renders/video/hero-dome.mp4` (1080p). Built with `tools/hero-dome-video.mjs` and `tools/hero_dome_video.py`. Jamie cut the groundwork opening, so it starts with the containers craning in.
- Before the form works live: `RESEND_API_KEY` in Cloudflare (email to Christie, Jamie cc'd). Add `GHL_SCHOOLS_API_KEY` and `GHL_SCHOOLS_LOCATION_ID` once Jamie has created the Schools sub-account.
- Open: whether to remove the "Day 1 … about 5 days" timings from the shared 3D concept (it breaks the no-timings rule). Jamie's feedback on the live page is to follow.
- `npm test`: "Holmer Green ticker missing after JS" fails on the website branch without these changes too. Not caused by this work.
- 25 Nov, later: Integrator's 13 wording edits are pushed to the website branch (9557dd5). FAQ answers now always show and `/hero-dome` is prerendered (still noindex, not in the sitemap). Video captions were updated to match. Placeholders are live for the clear height and the three "Who are Hoop Heroes?" figures, waiting for Jamie's checked numbers. The enquiry form is unchanged and will be repointed once Integrator has the GHL Schools embed code.
- Figures live on the page: 400 children a week, 9 locations across Buckinghamshire, Oxfordshire, Hertfordshire and Berkshire, since 2018, and a clear height of about 8 m. Jamie (25 Nov): use "9 locations" (not "10 towns") and keep Herts everywhere. Changed in the deck source, its text version and the microsite draft; the published deck artifact still needs republishing.
