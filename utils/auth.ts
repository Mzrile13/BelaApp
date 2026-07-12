// Lightweight shared-password auth. A single set of credentials protects the
// whole app; on success we hand out a signed, expiring session cookie so the
// user stays logged in across visits without re-entering the password.

export const AUTH_COOKIE = "bela_auth";
// 30 days – long enough that the app feels "logged in for a while".
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

function getSecret() {
  return process.env.AUTH_SECRET ?? "bela-tracker-dev-secret-change-me";
}

function getCredentials() {
  return {
    username: process.env.APP_USERNAME ?? "Kralj",
    password: process.env.APP_PASSWORD ?? "Tref",
  };
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(signature);
}

function timingSafeEqual(a: string, b: string) {
  // Iteriramo uvijek preko duljeg niza (bez ranog izlaza na razlici duljine),
  // pa vrijeme izvođenja ne otkriva podudaranje prefiksa ni duljinu tajne.
  const len = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < len; i += 1) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    mismatch |= ca ^ cb;
  }
  return mismatch === 0;
}

export function checkCredentials(username: string, password: string) {
  const expected = getCredentials();
  // Both comparisons run to avoid short-circuit timing leaks.
  const userOk = timingSafeEqual(username, expected.username);
  const passOk = timingSafeEqual(password, expected.password);
  return userOk && passOk;
}

/** Creates a `<expiry>.<signature>` token good for {@link SESSION_DURATION_MS}. */
export async function createSessionToken() {
  const expires = String(Date.now() + SESSION_DURATION_MS);
  const signature = await sign(expires);
  return `${expires}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = await sign(payload);
  if (!timingSafeEqual(signature, expected)) return false;

  const expires = Number(payload);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;
  return true;
}
