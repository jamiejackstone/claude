# Hoop Heroes Coach Portal — Cloudflare migration

Migration of the Head Coach App off the suspended Google AI Studio / Firebase
project onto Cloudflare, mirroring the website migration (GitHub → Workers
Builds → custom domain). Parent incident: GCP project suspended, coach app down.

**Target:** live at `coach.hoopheroes.co.uk`, coaches + admin log in via
Cloudflare Access, session plans stored in D1, no Google/AI Studio dependency,
no API keys in frontend code.

---

## What's in this folder

| Path | What it is |
|------|-----------|
| `src/` | The React app, ported off Firebase — all data + auth now go through the Worker API |
| `worker/index.ts` | Cloudflare Worker: serves the SPA + REST API over D1, reads the Cloudflare Access identity, proxies Gemini/GHL/Resend/TeamUp server-side |
| `worker/access.ts` | Verifies the Cloudflare Access JWT so the identity can't be spoofed |
| `schema.sql` | D1 table definitions |
| `seed/seed.sql` | **Rescued production data** as idempotent inserts (117 session plans, 60 drills, 55 ratings, 8 users, 9 locations, term schedule) |
| `data-rescue/` | Human-readable JSON snapshot of everything exported from the dying Firebase project on 2026-08-25 |
| `wrangler.jsonc` | Worker + D1 + static-assets config |

## Architecture change

| Before (Firebase / AI Studio) | After (Cloudflare) |
|---|---|
| Firestore collections | **D1** tables (documents kept as JSON columns) |
| Firebase Auth (email/password + Google) | **Cloudflare Access** (email OTP / Google) in front of the Worker |
| Role from Firestore `users` doc | Role from the `users` table, keyed by the Access identity email |
| `GEMINI_API_KEY` injected into the browser ← **outage root cause** | Gemini proxied through the Worker with a **Worker Secret** |
| GHL welfare webhook URL hardcoded in frontend | Worker Secret `GHL_WELFARE_WEBHOOK_URL`, proxied via `/api/welfare-check` |
| Resend / TeamUp keys in the Node server | Worker Secrets, proxied server-side |
| Express `server.ts` | Worker `fetch` handler |

No secret of any kind is shipped to the browser any more.

---

## Data rescue (done first — the GCP project could be deleted, not just suspended)

Everything readable was exported from the live-but-suspended Firebase project
before touching anything else. Captured to `data-rescue/` and `seed/seed.sql`:

- **session_plans** — 117
- **drills** — 60
- **drill_ratings** — 55
- **users** — 8  (roles: 1 OWNER, 1 ADMINISTRATOR, 6 HEAD_COACH)
- **locations** — 9
- **settings/schedule** — term dates

Not recoverable via the export (Firestore rules block them for a self-service
account): `reports`, `coach_profiles`, `timesheet_entries`,
`monthly_submissions`. Reports are also emailed to lara@/jamie@ via Resend, so
those live in the inbox. If you still have owner access to the Firebase console,
export those four collections from there before the project is deleted.

---

## Deploy runbook (the Cloudflare dashboard steps)

The code + rescued data are ready. These steps need your Cloudflare account —
they can't be done from the repo. About 20–30 minutes.

### 1. Create the D1 database and load the data
```bash
cd coach-app
npm install
npx wrangler d1 create hoop-heroes-coach
```
Copy the `database_id` it prints into `wrangler.jsonc` (replace
`REPLACE_WITH_D1_DATABASE_ID`). Then load schema + rescued data into the remote
database:
```bash
npm run db:schema:remote
npm run db:seed:remote
```

### 2. Connect the repo in Workers Builds
Cloudflare dashboard → **Workers & Pages → Create → Import a repository** →
pick `jamiejackstone/claude`, same as the website.
- **Root directory:** `coach-app`
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- **Production branch:** `claude/coach-app-migration-g2fuzh` (or merge to `main`
  first and use that)

The first build deploys to `hoop-heroes-coach.<subdomain>.workers.dev`. Open it
— you'll get the login screen (D1 is bound, but Access isn't in front yet, so
identity resolves via the dev fallback only; that's expected until step 4).

### 3. Set the Worker Secrets (never commit these)
```bash
npx wrangler secret put GEMINI_API_KEY            # new key — the old one leaked, rotate it
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put GHL_WELFARE_WEBHOOK_URL   # the LeadConnector welfare webhook
npx wrangler secret put TEAMUP_API_TOKEN          # optional — registers/attendance
npx wrangler secret put TEAMUP_BUSINESS_ID        # optional
```
> The Gemini key that was embedded in the old frontend is compromised — generate
> a fresh one and delete the old key in Google AI Studio.

### 4. Put Cloudflare Access in front (replaces all auth code)
Cloudflare dashboard → **Zero Trust → Access → Applications → Add an
application → Self-hosted**:
- **Application domain:** `coach.hoopheroes.co.uk`
- **Identity providers:** One-time PIN (email) and/or Google — both free up to 50 users.
- **Policy 1 “Coaches”** — Action: Allow. Include → *Emails* → paste the 8 coach
  emails from `data-rescue/users.json` (or *Emails ending in* `@hoopheroes.co.uk`
  plus the individual gmail/aol addresses).
- Copy the application **Audience (AUD) tag**.

Then wire the Worker to verify Access tokens (so the `*.workers.dev` origin
can't be used to bypass Access):
- In `wrangler.jsonc` set `vars.ACCESS_TEAM_DOMAIN` to your team domain
  (e.g. `hoopheroes.cloudflareaccess.com`) and `vars.ACCESS_AUD` to the AUD tag,
  then redeploy (push, or `npx wrangler deploy`).

Roles are **not** managed in Access — they come from the `users` table by email.
Admins (OWNER/ADMINISTRATOR) get the admin screens; everyone else is a coach.
Add a new coach from the in-app Admin page (writes the `users` row) **and** add
their email to the Access policy.

### 5. Cut the domain over
- **Workers → hoop-heroes-coach → Settings → Domains & Routes → Add custom
  domain →** `coach.hoopheroes.co.uk`. Cloudflare provisions the cert and points
  the hostname at the Worker.
- **DNS:** delete the dead `coach` → `ghs.googlehosted.com` CNAME (the custom
  domain adds its own proxied record).
- Test signed in as a coach (see only your locations) and as admin (see the
  Admin + Reports screens).

### 6. Uptime monitoring (Charter rule 3 — no silent failure)
Add a health check so the next outage isn't discovered by a coach:
- **Cloudflare → Notifications → Health Checks** (or an external monitor) against
  `https://coach.hoopheroes.co.uk/api/me` — it returns HTTP 200 with
  `{"authenticated":false}` when unauthenticated, which is a fine liveness probe,
  or point it at the root and alert on non-200 / TLS failure. Send alerts to the
  same place the website monitor does.

---

## Local development
```bash
cd coach-app
npm install
cp .dev.vars.example .dev.vars          # set DEV_USER_EMAIL to a real coach email
npm run db:schema:local && npm run db:seed:local
npm run dev                             # http://localhost:8787
```
`wrangler dev` isn't behind Access, so identity comes from `DEV_USER_EMAIL`.
In production that variable is ignored — the verified Access JWT is the only
source of identity.

## API surface (all under `/api`, same-origin, identity from Access)
`me`, `users`, `locations`, `session-plans` (+ `/propagate`), `drills`,
`drill-ratings`, `settings/:id`, `reports`, `coach-profiles`,
`ai/{huddle-quote,term-quotes,drill-curate}`, `welfare-check`, `email/report`,
`feedback`, `teamup/*`.
