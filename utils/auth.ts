// Auth po računu (grupi). Svaki račun je jedan dijeljeni username + lozinka koji
// koristi jedno društvo igrača; session cookie nosi id tog računa, pa cijeli
// podatkovni sloj može filtrirati po njemu.

export const AUTH_COOKIE = "bela_auth";
// 30 dana – dovoljno da se app osjeća "prijavljeno neko vrijeme".
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

// PBKDF2 preko Web Crypto: radi i u Node i u Edge runtimeu, bez nove ovisnosti.
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_KEY_BITS = 256;

const DEV_SECRET = "bela-tracker-dev-secret-change-me";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  // Javni fallback je dopušten samo lokalno (dev ili lokalni FileRepo). U
  // produkciji bi s njim bilo tko mogao potpisati cookie za poznati id računa,
  // pa radije odbijemo svaki zahtjev nego da tiho radimo s njim.
  if (process.env.NODE_ENV !== "production" || process.env.BELA_DATA_DIR) {
    return secret || DEV_SECRET;
  }
  throw new Error("AUTH_SECRET mora biti postavljen (najmanje 32 znaka)");
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
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

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    PBKDF2_KEY_BITS,
  );
  return new Uint8Array(bits);
}

/** Zapis oblika `pbkdf2$sha256$<iteracije>$<salt b64>$<hash b64>`. */
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES));
  const derived = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$sha256$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 5) return false;
  const [scheme, hash, iterationsRaw, saltB64, expectedB64] = parts;
  if (scheme !== "pbkdf2" || hash !== "sha256") return false;

  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 1_000_000) return false;

  let salt: Uint8Array;
  try {
    salt = fromBase64(saltB64!);
  } catch {
    return false;
  }

  const derived = await pbkdf2(password, salt, iterations);
  return timingSafeEqual(toBase64(derived), expectedB64!);
}

/**
 * Kratki otisak trenutnog hasha lozinke. Ide u token, pa promjena lozinke
 * poništi sve postojeće sesije (dijeljena lozinka grupe: bivši član ne smije
 * zadržati pristup). HMAC, a ne goli hash, da token ne nosi ništa iz kojeg bi
 * se dalo pogađati lozinku.
 */
export async function passwordVersion(passwordHash: string) {
  return (await sign(`pv:${passwordHash}`)).slice(0, 16);
}

/**
 * Token oblika `<accountId>.<expiry>.<passwordVersion>.<potpis>`, važeći
 * {@link SESSION_DURATION_MS}.
 */
export async function createSessionToken(accountId: string, passwordHash: string) {
  const expires = String(Date.now() + SESSION_DURATION_MS);
  const payload = `${accountId}.${expires}.${await passwordVersion(passwordHash)}`;
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

export interface Session {
  accountId: string;
  /** Nema ga u tokenima izdanima prije uvođenja otiska lozinke. */
  passwordVersion: string | null;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<Session | null> {
  if (!token) return null;
  const parts = token.split(".");

  // Stari format (`<expiry>.<potpis>`, bez identiteta) iz verzije s jednim
  // hard-coded userom. Prihvaćamo ga dok postojeći cookieji ne isteknu, da se pri
  // deployu nitko ne odjavi, i mapiramo ga na račun u koji su podaci migrirani.
  if (parts.length === 2) {
    const legacyAccountId = process.env.LEGACY_ACCOUNT_ID;
    if (!legacyAccountId) return null;
    const [expiresRaw, signature] = parts;
    if (!(await isValid(expiresRaw!, expiresRaw!, signature!))) return null;
    return { accountId: legacyAccountId, passwordVersion: null };
  }

  // Token bez otiska lozinke (prije njegova uvođenja) vrijedi dok ne istekne,
  // da deploy nikoga ne odjavi.
  if (parts.length === 3) {
    const [accountId, expiresRaw, signature] = parts;
    if (!accountId) return null;
    if (!(await isValid(`${accountId}.${expiresRaw}`, expiresRaw!, signature!))) return null;
    return { accountId, passwordVersion: null };
  }

  if (parts.length !== 4) return null;
  const [accountId, expiresRaw, version, signature] = parts;
  if (!accountId || !version) return null;
  if (!(await isValid(`${accountId}.${expiresRaw}.${version}`, expiresRaw!, signature!))) {
    return null;
  }
  return { accountId, passwordVersion: version };
}

async function isValid(payload: string, expiresRaw: string, signature: string) {
  if (!expiresRaw || !signature) return false;
  const expected = await sign(payload);
  if (!timingSafeEqual(signature, expected)) return false;
  const expires = Number(expiresRaw);
  return Number.isFinite(expires) && Date.now() <= expires;
}
