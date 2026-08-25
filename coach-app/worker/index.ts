// Hoop Heroes Coach Portal — Cloudflare Worker
//
// Serves the built React SPA (via the ASSETS binding) and a REST API backed by
// D1. Authentication is handled entirely by Cloudflare Access in front of the
// Worker; this code only reads the verified identity and looks up the coach's
// role/locations from the `users` table. No secrets ever reach the browser —
// Gemini, GHL, Resend and TeamUp calls are all proxied here.

import { resolveIdentity } from "./access";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  // Access
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  DEV_USER_EMAIL?: string;
  // Secrets
  GEMINI_API_KEY?: string;
  RESEND_API_KEY?: string;
  GHL_WELFARE_WEBHOOK_URL?: string;
  TEAMUP_API_TOKEN?: string;
  TEAMUP_BUSINESS_ID?: string;
  REPORT_TO_EMAILS?: string; // comma-separated; defaults to lara+jamie
  FROM_EMAIL?: string;
}

interface Identity {
  email: string;
  name: string;
  role: string;
  locations: string[];
  hourlyRate?: number;
}

const ADMIN_ROLES = new Set(["OWNER", "ADMINISTRATOR"]);
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (err: any) {
        console.error("API error:", err);
        return json({ error: err?.message || "Internal error" }, 500);
      }
    }

    // Everything else is the SPA (static assets + client-side routes).
    return env.ASSETS.fetch(request);
  },
};

// ---------------------------------------------------------------------------
// Identity / users lookup
// ---------------------------------------------------------------------------

async function getIdentity(request: Request, env: Env): Promise<Identity | null> {
  const email = await resolveIdentity(request, env);
  if (!email) return null;
  const row = await env.DB.prepare(
    "SELECT email,name,role,hourly_rate,locations FROM users WHERE email = ?",
  )
    .bind(email)
    .first<{ email: string; name: string; role: string; hourly_rate: number | null; locations: string }>();
  if (!row) {
    // Authenticated via Access but not provisioned as a coach.
    return { email, name: "", role: "UNAUTHORIZED", locations: [] };
  }
  return {
    email: row.email,
    name: row.name,
    role: row.role,
    locations: safeParse(row.locations, []),
    hourlyRate: row.hourly_rate ?? undefined,
  };
}

function safeParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function requireAdmin(id: Identity): void {
  if (!ADMIN_ROLES.has(id.role)) throw httpError(403, "Admin access required");
}

function httpError(status: number, message: string): Error & { status?: number } {
  const e = new Error(message) as Error & { status?: number };
  e.status = status;
  return e;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname;
  const method = request.method;
  const id = await getIdentity(request, env);

  // Public-ish: identity endpoint reports auth state.
  if (path === "/api/me") {
    if (!id) return json({ authenticated: false }, 401);
    if (id.role === "UNAUTHORIZED")
      return json({ authenticated: true, provisioned: false, email: id.email }, 403);
    return json({ authenticated: true, provisioned: true, user: id });
  }

  // Everything below requires a provisioned coach.
  if (!id) return json({ error: "Not authenticated" }, 401);
  if (id.role === "UNAUTHORIZED")
    return json({ error: "Your email is not registered as a coach. Contact an administrator." }, 403);

  const seg = path.replace(/^\/api\//, "").split("/").filter(Boolean);

  try {
    switch (seg[0]) {
      case "users":
        return await usersRoute(seg, method, request, env, id);
      case "locations":
        return await locationsRoute(seg, method, request, env, id);
      case "session-plans":
        return await sessionPlansRoute(seg, method, request, env, id);
      case "drills":
        return await drillsRoute(seg, method, request, env, id);
      case "drill-ratings":
        return await drillRatingsRoute(seg, method, request, env, id);
      case "settings":
        return await settingsRoute(seg, method, request, env, id);
      case "reports":
        return await reportsRoute(seg, method, request, env, id);
      case "coach-profiles":
        return await coachProfilesRoute(seg, method, request, env, id, url);
      case "ai":
        return await aiRoute(seg, method, request, env);
      case "welfare-check":
        return await welfareRoute(method, request, env, id);
      case "email":
        return await emailRoute(seg, method, request, env);
      case "feedback":
        return await feedbackRoute(method, request, env);
      case "teamup":
      case "auth":
        return await teamupRoute(seg, method, request, env, url);
      default:
        return json({ error: "Not found" }, 404);
    }
  } catch (err: any) {
    return json({ error: err?.message || "Error" }, err?.status || 500);
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

async function usersRoute(seg: string[], method: string, request: Request, env: Env, id: Identity) {
  if (seg.length === 1 && method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT email,name,role,phone,hourly_rate,locations FROM users",
    ).all();
    return json((results || []).map(rowToUser));
  }
  if (seg.length === 1 && method === "POST") {
    requireAdmin(id);
    const b = (await request.json()) as any;
    const email = String(b.email || "").toLowerCase().trim();
    if (!email) throw httpError(400, "email required");
    await env.DB.prepare(
      "INSERT OR REPLACE INTO users (email,name,role,phone,hourly_rate,locations) VALUES (?,?,?,?,?,?)",
    )
      .bind(email, b.name || "", b.role || "HEAD_COACH", b.phone ?? null, b.hourlyRate ?? null, JSON.stringify(b.locations || []))
      .run();
    return json({ ok: true, id: email });
  }
  if (seg.length === 2) {
    const email = decodeURIComponent(seg[1]).toLowerCase().trim();
    if (method === "PATCH") {
      // Users may edit their own locations; admins may edit anyone.
      if (id.email !== email) requireAdmin(id);
      const b = (await request.json()) as any;
      const existing = await env.DB.prepare("SELECT email,name,role,phone,hourly_rate,locations FROM users WHERE email=?")
        .bind(email)
        .first<any>();
      if (!existing) throw httpError(404, "user not found");
      const merged = {
        name: b.name ?? existing.name,
        role: b.role ?? existing.role,
        phone: b.phone ?? existing.phone,
        hourly_rate: b.hourlyRate ?? existing.hourly_rate,
        locations: b.locations ? JSON.stringify(b.locations) : existing.locations,
      };
      await env.DB.prepare("UPDATE users SET name=?,role=?,phone=?,hourly_rate=?,locations=? WHERE email=?")
        .bind(merged.name, merged.role, merged.phone, merged.hourly_rate, merged.locations, email)
        .run();
      return json({ ok: true });
    }
    if (method === "DELETE") {
      requireAdmin(id);
      await env.DB.prepare("DELETE FROM users WHERE email=?").bind(email).run();
      return json({ ok: true });
    }
  }
  return json({ error: "Not found" }, 404);
}

function rowToUser(r: any): Identity {
  return {
    id: r.email,
    email: r.email,
    name: r.name,
    role: r.role,
    phone: r.phone ?? undefined,
    hourlyRate: r.hourly_rate ?? undefined,
    locations: safeParse(r.locations, []),
  } as any;
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

async function locationsRoute(seg: string[], method: string, request: Request, env: Env, id: Identity) {
  if (seg.length === 1 && method === "GET") {
    const { results } = await env.DB.prepare("SELECT id,data FROM locations").all<any>();
    return json((results || []).map((r) => ({ ...safeParse(r.data, {}), id: r.id })));
  }
  if (seg.length === 1 && method === "POST") {
    requireAdmin(id);
    const b = (await request.json()) as any;
    if (!b.id) throw httpError(400, "id required");
    await env.DB.prepare("INSERT OR REPLACE INTO locations (id,name,data) VALUES (?,?,?)")
      .bind(String(b.id), b.name ?? null, JSON.stringify(b))
      .run();
    return json({ ok: true, id: b.id });
  }
  if (seg.length === 2) {
    const locId = decodeURIComponent(seg[1]);
    if (method === "PATCH") {
      requireAdmin(id);
      const b = (await request.json()) as any;
      const existing = await env.DB.prepare("SELECT data FROM locations WHERE id=?").bind(locId).first<any>();
      const merged = { ...safeParse(existing?.data, {}), ...b, id: locId };
      await env.DB.prepare("INSERT OR REPLACE INTO locations (id,name,data) VALUES (?,?,?)")
        .bind(locId, (merged as any).name ?? null, JSON.stringify(merged))
        .run();
      return json({ ok: true });
    }
    if (method === "DELETE") {
      requireAdmin(id);
      await env.DB.prepare("DELETE FROM locations WHERE id=?").bind(locId).run();
      return json({ ok: true });
    }
  }
  return json({ error: "Not found" }, 404);
}

// ---------------------------------------------------------------------------
// Session plans
// ---------------------------------------------------------------------------

async function sessionPlansRoute(seg: string[], method: string, request: Request, env: Env, id: Identity) {
  if (seg.length === 1 && method === "GET") {
    const { results } = await env.DB.prepare("SELECT data FROM session_plans").all<any>();
    return json((results || []).map((r) => safeParse(r.data, {})));
  }
  // Bulk upsert of an array of plans.
  if (seg.length === 1 && method === "PUT") {
    requireAdmin(id);
    const plans = (await request.json()) as any[];
    const stmt = env.DB.prepare(
      "INSERT OR REPLACE INTO session_plans (id,term,week,age_group,location_id,data) VALUES (?,?,?,?,?,?)",
    );
    const batch = plans.map((p) =>
      stmt.bind(p.id, p.term ?? null, p.week ?? null, p.ageGroup ?? null, p.locationId ?? null, JSON.stringify(p)),
    );
    if (batch.length) await env.DB.batch(batch);
    return json({ ok: true, count: batch.length });
  }
  // Propagate activities to all location variants of a term/week/ageGroup.
  if (seg.length === 2 && seg[1] === "propagate" && method === "POST") {
    const b = (await request.json()) as any;
    const { results } = await env.DB.prepare(
      "SELECT id,data FROM session_plans WHERE term=? AND week=? AND age_group=?",
    )
      .bind(b.term, b.week, b.ageGroup)
      .all<any>();
    const stmt = env.DB.prepare("UPDATE session_plans SET data=? WHERE id=?");
    const batch = (results || [])
      .filter((r) => r.id !== b.excludeId)
      .map((r) => {
        const plan = safeParse<any>(r.data, {});
        plan.activities = b.activities;
        return stmt.bind(JSON.stringify(plan), r.id);
      });
    if (batch.length) await env.DB.batch(batch);
    return json({ ok: true, count: batch.length });
  }
  if (seg.length === 2) {
    const planId = decodeURIComponent(seg[1]);
    if (method === "PUT") {
      const p = (await request.json()) as any;
      p.id = planId;
      await env.DB.prepare(
        "INSERT OR REPLACE INTO session_plans (id,term,week,age_group,location_id,data) VALUES (?,?,?,?,?,?)",
      )
        .bind(planId, p.term ?? null, p.week ?? null, p.ageGroup ?? null, p.locationId ?? null, JSON.stringify(p))
        .run();
      return json({ ok: true });
    }
    if (method === "DELETE") {
      requireAdmin(id);
      await env.DB.prepare("DELETE FROM session_plans WHERE id=?").bind(planId).run();
      return json({ ok: true });
    }
  }
  return json({ error: "Not found" }, 404);
}

// ---------------------------------------------------------------------------
// Drills
// ---------------------------------------------------------------------------

async function drillsRoute(seg: string[], method: string, request: Request, env: Env, id: Identity) {
  if (seg.length === 1 && method === "GET") {
    const { results } = await env.DB.prepare("SELECT data FROM drills").all<any>();
    return json((results || []).map((r) => safeParse(r.data, {})));
  }
  if (seg.length === 2) {
    const drillId = decodeURIComponent(seg[1]);
    if (method === "PUT") {
      requireAdmin(id);
      const d = (await request.json()) as any;
      d.id = drillId;
      await env.DB.prepare("INSERT OR REPLACE INTO drills (id,name,data) VALUES (?,?,?)")
        .bind(drillId, d.name ?? null, JSON.stringify(d))
        .run();
      return json({ ok: true });
    }
    if (method === "PATCH") {
      // Partial merge — used for ratings/comments/history (allowed for any coach).
      const b = (await request.json()) as any;
      const existing = await env.DB.prepare("SELECT data FROM drills WHERE id=?").bind(drillId).first<any>();
      if (!existing) throw httpError(404, "drill not found");
      const merged = { ...safeParse<any>(existing.data, {}), ...b, id: drillId };
      await env.DB.prepare("UPDATE drills SET name=?,data=? WHERE id=?")
        .bind(merged.name ?? null, JSON.stringify(merged), drillId)
        .run();
      return json({ ok: true });
    }
    if (method === "DELETE") {
      requireAdmin(id);
      await env.DB.prepare("DELETE FROM drills WHERE id=?").bind(drillId).run();
      return json({ ok: true });
    }
  }
  return json({ error: "Not found" }, 404);
}

// ---------------------------------------------------------------------------
// Drill ratings
// ---------------------------------------------------------------------------

async function drillRatingsRoute(seg: string[], method: string, request: Request, env: Env, _id: Identity) {
  if (seg.length === 1 && method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id,drill_name,location_id,rating,updated_at FROM drill_ratings",
    ).all<any>();
    return json(
      (results || []).map((r) => ({
        id: r.id,
        drillName: r.drill_name,
        locationId: r.location_id,
        rating: r.rating,
        updatedAt: r.updated_at,
      })),
    );
  }
  if (seg.length === 2 && method === "PUT") {
    const ratingId = decodeURIComponent(seg[1]);
    const b = (await request.json()) as any;
    await env.DB.prepare(
      "INSERT OR REPLACE INTO drill_ratings (id,drill_name,location_id,rating,updated_at) VALUES (?,?,?,?,?)",
    )
      .bind(ratingId, b.drillName, b.locationId, b.rating, b.updatedAt || new Date().toISOString())
      .run();
    return json({ ok: true });
  }
  return json({ error: "Not found" }, 404);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

async function settingsRoute(seg: string[], method: string, request: Request, env: Env, id: Identity) {
  if (seg.length === 2) {
    const key = decodeURIComponent(seg[1]);
    if (method === "GET") {
      const row = await env.DB.prepare("SELECT data FROM settings WHERE id=?").bind(key).first<any>();
      return json(row ? safeParse(row.data, {}) : null);
    }
    if (method === "PUT") {
      requireAdmin(id);
      const b = await request.json();
      await env.DB.prepare("INSERT OR REPLACE INTO settings (id,data) VALUES (?,?)")
        .bind(key, JSON.stringify(b))
        .run();
      return json({ ok: true });
    }
  }
  return json({ error: "Not found" }, 404);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

async function reportsRoute(seg: string[], method: string, request: Request, env: Env, id: Identity) {
  if (seg.length === 1 && method === "GET") {
    requireAdmin(id); // reports are admin-only reads
    const { results } = await env.DB.prepare(
      "SELECT data FROM reports ORDER BY timestamp DESC",
    ).all<any>();
    return json((results || []).map((r) => safeParse(r.data, {})));
  }
  if (seg.length === 1 && method === "POST") {
    const b = (await request.json()) as any;
    const rid = b.id || crypto.randomUUID();
    b.id = rid;
    if (!b.timestamp) b.timestamp = Date.now();
    await upsertReport(env, b);
    return json({ ok: true, id: rid });
  }
  if (seg.length === 2) {
    const rid = decodeURIComponent(seg[1]);
    if (method === "PUT") {
      const b = (await request.json()) as any;
      b.id = rid;
      await upsertReport(env, b);
      return json({ ok: true });
    }
    if (method === "PATCH") {
      const b = (await request.json()) as any;
      const existing = await env.DB.prepare("SELECT data FROM reports WHERE id=?").bind(rid).first<any>();
      const merged = { ...safeParse<any>(existing?.data, {}), ...b, id: rid };
      await upsertReport(env, merged);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      requireAdmin(id);
      await env.DB.prepare("DELETE FROM reports WHERE id=?").bind(rid).run();
      return json({ ok: true });
    }
  }
  return json({ error: "Not found" }, 404);
}

async function upsertReport(env: Env, b: any) {
  await env.DB.prepare(
    "INSERT OR REPLACE INTO reports (id,type,location,age_group,coach_name,coach_email,timestamp,data) VALUES (?,?,?,?,?,?,?,?)",
  )
    .bind(
      b.id,
      b.type ?? null,
      b.location ?? null,
      b.ageGroup ?? null,
      b.coachName ?? null,
      b.coachEmail ?? null,
      String(b.timestamp ?? Date.now()),
      JSON.stringify(b),
    )
    .run();
}

// ---------------------------------------------------------------------------
// Coach profiles (welfare / self-assessment)
// ---------------------------------------------------------------------------

async function coachProfilesRoute(seg: string[], method: string, request: Request, env: Env, id: Identity, url: URL) {
  if (seg.length === 1 && method === "POST") {
    const b = (await request.json()) as any;
    const rid = crypto.randomUUID();
    const doc = { ...b, id: rid, timestamp: b.timestamp || new Date().toISOString() };
    await env.DB.prepare(
      "INSERT OR REPLACE INTO coach_profiles (id,user_id,user_name,timestamp,data) VALUES (?,?,?,?,?)",
    )
      .bind(rid, doc.userId ?? null, doc.userName ?? null, doc.timestamp, JSON.stringify(doc))
      .run();
    return json({ ok: true, id: rid });
  }
  if (seg.length === 1 && method === "GET") {
    const userId = url.searchParams.get("userId");
    const limit = url.searchParams.get("limit");
    let query = "SELECT data FROM coach_profiles";
    const binds: any[] = [];
    // Non-admins can only read their own profiles.
    const scopeUser = ADMIN_ROLES.has(id.role) ? userId : id.email;
    if (scopeUser) {
      query += " WHERE user_id=?";
      binds.push(scopeUser);
    }
    query += " ORDER BY timestamp DESC";
    if (limit) query += ` LIMIT ${parseInt(limit, 10) || 1}`;
    const { results } = await env.DB.prepare(query).bind(...binds).all<any>();
    return json((results || []).map((r) => safeParse(r.data, {})));
  }
  return json({ error: "Not found" }, 404);
}

// ---------------------------------------------------------------------------
// AI — server-side Gemini (key never reaches the browser)
// ---------------------------------------------------------------------------

async function aiRoute(seg: string[], method: string, request: Request, env: Env) {
  if (method !== "POST") return json({ error: "Not found" }, 404);
  if (!env.GEMINI_API_KEY) return json({ error: "AI not configured" }, 503);
  const b = (await request.json()) as any;
  const model = "gemini-3-flash-preview";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  if (seg[1] === "huddle-quote") {
    const prompt = `Generate a short, inspiring huddle quote or a conversation-starting question for a youth basketball session.

Context:
- Organization: Hoop Heroes
- Sport: Basketball
- Core Value of the week: ${b.coreValue}
- Age Group: ${b.ageGroup}

Requirements:
- Relevant to the core value, tailored to the age group, basketball-themed.
- Concise (1-2 sentences). No preamble — just the quote/question.`;
    const text = await geminiText(endpoint, prompt);
    return json({ text: text || "A hero is someone who has given his or her life to something bigger than oneself." });
  }

  if (seg[1] === "term-quotes") {
    const coreValues: string[] = b.coreValues || [];
    const prompt = `Generate a list of ${coreValues.length} short, inspiring huddle quotes or conversation-starting questions for youth basketball sessions.

Context:
- Organization: Hoop Heroes
- Sport: Basketball
- Age Group: ${b.ageGroup}

Core Values for each week:
${coreValues.map((cv, i) => `Week ${i + 1}: ${cv}`).join("\n")}

Requirements:
- Each relevant to its week's core value, tailored to the age group, basketball-themed, concise.
- Return as a JSON array of strings. No preamble.`;
    const text = await geminiText(endpoint, prompt, true);
    try {
      return json({ quotes: JSON.parse(text || "[]") });
    } catch {
      return json({ quotes: coreValues.map(() => "A hero is someone who has given his or her life to something bigger than oneself.") });
    }
  }

  if (seg[1] === "drill-curate") {
    const videoUrl = String(b.videoUrl || "");
    const prompt = `Analyze this basketball drill video: ${videoUrl}.
Extract the following information in JSON format:
{
  "name": "Drill Name",
  "focus": "One of: Shooting, Passing, Defence, Dribbling, Rebounding",
  "summary": "Brief summary of the drill",
  "easy": "Setup or easy version",
  "expert": "Expert version or challenge",
  "coachCues": "Key coaching points",
  "types": ["Warm-up" or "Skill"],
  "ageGroups": ["Rookies", "Rising Stars", "Ballers"]
}
If you cannot analyze the video or it's not a basketball drill, return {"error":"message"}.`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) return json({ error: `Gemini ${res.status}` }, 502);
    const data = (await res.json()) as any;
    const out = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}").trim();
    try {
      return json(JSON.parse(out));
    } catch {
      return json({ error: "Could not parse AI response" }, 502);
    }
  }
  return json({ error: "Not found" }, 404);
}

async function geminiText(endpoint: string, prompt: string, jsonMode = false): Promise<string> {
  const body: any = { contents: [{ parts: [{ text: prompt }] }] };
  if (jsonMode) body.generationConfig = { responseMimeType: "application/json" };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = (await res.json()) as any;
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
}

// ---------------------------------------------------------------------------
// Welfare webhook — GHL/CRM URL lives ONLY as a Worker secret
// ---------------------------------------------------------------------------

async function welfareRoute(method: string, request: Request, env: Env, id: Identity) {
  if (method !== "POST") return json({ error: "Not found" }, 404);
  if (!env.GHL_WELFARE_WEBHOOK_URL) return json({ error: "Welfare webhook not configured" }, 503);
  const p = (await request.json()) as any;
  // Only the 8 permitted fields are forwarded — no incident/medical detail.
  const payload = {
    parent_first_name: (p.parent_first_name || "").trim(),
    parent_email: (p.parent_email || "").trim(),
    parent_phone: (p.parent_phone || "").trim(),
    child_first_name: (p.child_first_name || "").trim(),
    location_name: (p.location_name || "").trim(),
    session_date: p.session_date || new Date().toISOString().split("T")[0],
    severity: p.severity === "serious" ? "serious" : "routine",
    submitted_by_coach: (p.submitted_by_coach || id.name || "Coach").trim(),
  };
  const attempt = () =>
    fetch(env.GHL_WELFARE_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  let res = await attempt();
  if (!res.ok) res = await attempt(); // retry once
  if (!res.ok) return json({ success: false, error: `Webhook HTTP ${res.status}` }, 502);
  return json({ success: true });
}

// ---------------------------------------------------------------------------
// Email — Resend (server-side)
// ---------------------------------------------------------------------------

function reportRecipients(env: Env): string[] {
  return (env.REPORT_TO_EMAILS || "lara@hoopheroes.co.uk,jamie@hoopheroes.co.uk")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function sendEmail(env: Env, opts: { to: string[]; subject: string; text: string; replyTo?: string }) {
  if (!env.RESEND_API_KEY) return { ok: false, skipped: true };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.FROM_EMAIL || "Hoop Heroes Portal <portal@notifications.hoopheroes.co.uk>",
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  });
  return { ok: res.ok };
}

async function emailRoute(seg: string[], method: string, request: Request, env: Env) {
  if (seg[1] === "report" && method === "POST") {
    const r = (await request.json()) as any;
    const subject = `${String(r.type || "").toUpperCase()} REPORT - ${r.location} - ${r.ageGroup} - ${r.coachName}`;
    const result = await sendEmail(env, {
      to: reportRecipients(env),
      subject,
      replyTo: r.coachEmail,
      text: `A new ${r.type} report has been submitted.\n\nCoach: ${r.coachName}\nLocation: ${r.location}\nAge Group: ${r.ageGroup}\n\nDetails:\n${JSON.stringify(r, null, 2)}`,
    });
    return json({ success: true, emailed: result.ok });
  }
  return json({ error: "Not found" }, 404);
}

async function feedbackRoute(method: string, request: Request, env: Env) {
  if (method !== "POST") return json({ error: "Not found" }, 404);
  const b = (await request.json()) as any;
  const { coachName, coachEmail, location, ageGroup, week, ratings, notes } = b;
  await sendEmail(env, {
    to: ["lara@hoopheroes.co.uk"],
    subject: `Class Feedback - ${location} - ${ageGroup} - ${coachName}`,
    replyTo: coachEmail,
    text: `New class feedback received.\n\nCoach: ${coachName}\nLocation: ${location}\nAge Group: ${ageGroup}\nWeek: ${week}\n\nRatings:\n- Engagement: ${ratings?.engagement}\n- Skill Level: ${ratings?.skillLevel}\n- Fun Factor: ${ratings?.funFactor}\n\nFeedback: ${notes}`,
  });
  return json({ success: true });
}

// ---------------------------------------------------------------------------
// TeamUp proxy (token secret; Workers reach api.goteamup.com directly)
// ---------------------------------------------------------------------------

const TEAMUP_BASE = "https://api.goteamup.com/api/v2";

async function teamupRoute(seg: string[], method: string, request: Request, env: Env, url: URL) {
  // /api/auth/teamup/url — with the token-secret model there is no OAuth dance.
  if (seg[0] === "auth" && seg[1] === "teamup" && seg[2] === "url") {
    return json({ url: null, tokenConfigured: !!env.TEAMUP_API_TOKEN });
  }
  if (seg[0] !== "teamup") return json({ error: "Not found" }, 404);
  if (!env.TEAMUP_API_TOKEN) return json({ error: "AUTH_REQUIRED" }, 401);
  const headers = {
    Authorization: `Token ${env.TEAMUP_API_TOKEN}`,
    "Content-Type": "application/json",
  };

  if (seg[1] === "sessions" && method === "GET") {
    const date = url.searchParams.get("date");
    const q = new URL(`${TEAMUP_BASE}/sessions/`);
    if (env.TEAMUP_BUSINESS_ID) q.searchParams.set("business", env.TEAMUP_BUSINESS_ID);
    if (date) {
      q.searchParams.set("start_date", date);
      q.searchParams.set("end_date", date);
    }
    return await proxy(q.toString(), { headers });
  }
  if (seg[1] === "registrations" && seg[2] && method === "GET") {
    const q = new URL(`${TEAMUP_BASE}/registrations/`);
    q.searchParams.set("session", decodeURIComponent(seg[2]));
    return await proxy(q.toString(), { headers });
  }
  if (seg[1] === "attendance" && method === "POST") {
    const b = (await request.json()) as any;
    if (!b.registrationId) return json({ error: "registrationId is required" }, 400);
    return await proxy(`${TEAMUP_BASE}/registrations/${b.registrationId}/`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ attended: b.attended }),
    });
  }
  return json({ error: "Not found" }, 404);
}

async function proxy(url: string, init: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
