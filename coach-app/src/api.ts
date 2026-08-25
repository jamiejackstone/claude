// Thin REST client for the Cloudflare Worker API that replaced Firestore.
// All requests are same-origin; Cloudflare Access supplies the identity, so we
// never send tokens from here.

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    const err = new Error(message) as Error & { status?: number; body?: unknown };
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => req<T>("GET", path),
  post: <T>(path: string, body?: unknown) => req<T>("POST", path, body ?? {}),
  put: <T>(path: string, body?: unknown) => req<T>("PUT", path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => req<T>("PATCH", path, body ?? {}),
  del: <T>(path: string) => req<T>("DELETE", path),
};

// Encode a path segment (ids can contain @ / spaces).
export const seg = (s: string) => encodeURIComponent(s);
