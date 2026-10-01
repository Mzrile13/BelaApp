import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  hashPassword,
  passwordVersion,
  verifyPassword,
  verifySessionToken,
} from "../utils/auth";

const ACCOUNT = "11111111-1111-1111-1111-111111111111";
const LEGACY = "00000000-0000-0000-0000-000000000001";

afterEach(() => {
  delete process.env.LEGACY_ACCOUNT_ID;
  vi.unstubAllEnvs();
});

describe("tajna za potpis", () => {
  it("u produkciji bez AUTH_SECRET odbija potpisati token umjesto javnog fallbacka", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("BELA_DATA_DIR", "");
    await expect(createSessionToken(ACCOUNT, "hash")).rejects.toThrow(/AUTH_SECRET/);
  });

  it("u produkciji odbija prekratku tajnu", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "kratko");
    vi.stubEnv("BELA_DATA_DIR", "");
    await expect(createSessionToken(ACCOUNT, "hash")).rejects.toThrow(/AUTH_SECRET/);
  });
});

describe("hashPassword / verifyPassword", () => {
  it("prihvaća točnu lozinku", async () => {
    const stored = await hashPassword("tajna-lozinka");
    expect(await verifyPassword("tajna-lozinka", stored)).toBe(true);
  });

  it("odbija krivu lozinku", async () => {
    const stored = await hashPassword("tajna-lozinka");
    expect(await verifyPassword("tajna-lozinkaa", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("koristi nasumičnu sol, pa ista lozinka daje različit zapis", async () => {
    expect(await hashPassword("ista")).not.toBe(await hashPassword("ista"));
  });

  it("odbija neispravan ili prazan zapis umjesto da pukne", async () => {
    for (const stored of ["", "!", "pbkdf2$sha256$210000$onlythree", "bcrypt$x$y$z$w", null]) {
      expect(await verifyPassword("bilo sto", stored)).toBe(false);
    }
  });
});

describe("session token", () => {
  const HASH = "pbkdf2$sha256$210000$c29s$aGFzaA==";

  it("vraća račun i otisak lozinke iz vlastitog tokena", async () => {
    const token = await createSessionToken(ACCOUNT, HASH);
    expect(await verifySessionToken(token)).toEqual({
      accountId: ACCOUNT,
      passwordVersion: await passwordVersion(HASH),
    });
  });

  it("otisak se mijenja s lozinkom i ne otkriva hash", async () => {
    const other = await passwordVersion("pbkdf2$sha256$210000$c29s$ZHJ1Z2k=");
    expect(other).not.toBe(await passwordVersion(HASH));
    expect(await passwordVersion(HASH)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("odbija petljan potpis", async () => {
    const token = await createSessionToken(ACCOUNT, HASH);
    const parts = token.split(".");
    parts[3] = parts[3]!.replace(/.$/, (c) => (c === "a" ? "b" : "a"));
    expect(await verifySessionToken(parts.join("."))).toBeNull();
  });

  it("odbija podmetnut accountId ili otisak (potpis pokriva oboje)", async () => {
    const token = await createSessionToken(ACCOUNT, HASH);
    const [, expires, version, signature] = token.split(".");
    expect(
      await verifySessionToken(`22222222-2222-2222-2222-222222222222.${expires}.${version}.${signature}`),
    ).toBeNull();
    expect(await verifySessionToken(`${ACCOUNT}.${expires}.0000000000000000.${signature}`)).toBeNull();
  });

  it("prihvaća token bez otiska izdan prije njegova uvođenja", async () => {
    const token = await createSessionToken(ACCOUNT, HASH);
    const [, expires] = token.split(".");
    const legacy = `${ACCOUNT}.${expires}.${await hmacHex(`${ACCOUNT}.${expires}`)}`;
    expect(await verifySessionToken(legacy)).toEqual({ accountId: ACCOUNT, passwordVersion: null });
  });

  it("odbija prazan i besmislen token", async () => {
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
    expect(await verifySessionToken("nesto")).toBeNull();
  });
});

async function hmacHex(payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(process.env.AUTH_SECRET ?? "bela-tracker-dev-secret-change-me"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("stari token bez identiteta", () => {
  // Prijelazna kompatibilnost: cookieji izdani prije multi-tenancyja imaju
  // oblik `<expiry>.<potpis>` i moraju se mapirati na legacy račun, da se pri
  // deployu nitko ne odjavi.
  async function legacyToken(expires: number) {
    return `${expires}.${await hmacHex(String(expires))}`;
  }

  it("mapira se na legacy račun kad je LEGACY_ACCOUNT_ID postavljen", async () => {
    process.env.LEGACY_ACCOUNT_ID = LEGACY;
    const token = await legacyToken(Date.now() + 60_000);
    expect(await verifySessionToken(token)).toEqual({ accountId: LEGACY, passwordVersion: null });
  });

  it("odbija se kad LEGACY_ACCOUNT_ID nije postavljen", async () => {
    const token = await legacyToken(Date.now() + 60_000);
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("odbija istekao stari token", async () => {
    process.env.LEGACY_ACCOUNT_ID = LEGACY;
    const token = await legacyToken(Date.now() - 1_000);
    expect(await verifySessionToken(token)).toBeNull();
  });
});
