// Cloudflare Access identity resolution.
//
// In production the app sits behind a Cloudflare Access application, which
// authenticates the visitor (email OTP or Google) and injects a signed JWT
// (Cf-Access-Jwt-Assertion) plus the Cf-Access-Authenticated-User-Email
// header on every request. We VERIFY the JWT rather than trusting the plain
// header, so that direct hits to the *.workers.dev origin (which do not pass
// through Access) cannot spoof an identity.
//
// If ACCESS_TEAM_DOMAIN / ACCESS_AUD are not configured (local `wrangler dev`),
// we fall back to DEV_USER_EMAIL from .dev.vars so the app is runnable offline.

export interface AccessEnv {
  ACCESS_TEAM_DOMAIN?: string; // e.g. hoopheroes.cloudflareaccess.com
  ACCESS_AUD?: string;         // Access application Audience (AUD) tag
  DEV_USER_EMAIL?: string;     // local dev only
}

interface Jwk {
  kid: string;
  kty: string;
  alg: string;
  n: string;
  e: string;
}

// Simple in-isolate cache for the Access signing keys.
let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getJwks(teamDomain: string): Promise<Jwk[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const body = (await res.json()) as { keys: Jwk[] };
  jwksCache = { keys: body.keys, fetchedAt: Date.now() };
  return body.keys;
}

function b64urlToUint8(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeSegment(seg: string): any {
  return JSON.parse(new TextDecoder().decode(b64urlToUint8(seg)));
}

async function verifyJwt(token: string, teamDomain: string, aud: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const header = decodeSegment(headerB64);
  const payload = decodeSegment(payloadB64);

  // Claims: issuer, audience, expiry.
  const iss = `https://${teamDomain}`;
  if (payload.iss !== iss) return null;
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (aud && !auds.includes(aud)) return null;
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;

  const jwks = await getJwks(teamDomain);
  const jwk = jwks.find((k) => k.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true } as JsonWebKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToUint8(sigB64), data);
  if (!ok) return null;

  const email = (payload.email || payload.identity_nonce || "").toString().toLowerCase().trim();
  return email || null;
}

/**
 * Resolve the authenticated email for a request, or null if unauthenticated.
 * Verifies the Access JWT when the team is configured; otherwise uses the
 * DEV_USER_EMAIL fallback for local development.
 */
export async function resolveIdentity(request: Request, env: AccessEnv): Promise<string | null> {
  const teamDomain = env.ACCESS_TEAM_DOMAIN;
  const aud = env.ACCESS_AUD || "";

  if (teamDomain) {
    const jwt =
      request.headers.get("Cf-Access-Jwt-Assertion") ||
      cookieValue(request, "CF_Authorization");
    if (!jwt) return null;
    try {
      return await verifyJwt(jwt, teamDomain, aud);
    } catch {
      return null;
    }
  }

  // Local dev fallback.
  if (env.DEV_USER_EMAIL) return env.DEV_USER_EMAIL.toLowerCase().trim();
  return null;
}

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}
