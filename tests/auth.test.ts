import { afterEach, describe, expect, it } from "vitest";
import {
  createSessionToken,
  hashPassword,
  verifyPassword,
  verifySessionToken,
} from "../utils/auth";

const ACCOUNT = "11111111-1111-1111-1111-111111111111";
const LEGACY = "00000000-0000-0000-0000-000000000001";

afterEach(() => {
  delete process.env.LEGACY_ACCOUNT_ID;
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
  it("vraća račun iz vlastitog tokena", async () => {
    const token = await createSessionToken(ACCOUNT);
    expect(await verifySessionToken(token)).toEqual({ accountId: ACCOUNT });
  });

  it("odbija petljan potpis", async () => {
    const token = await createSessionToken(ACCOUNT);
    const parts = token.split(".");
    parts[2] = parts[2]!.replace(/.$/, (c) => (c === "a" ? "b" : "a"));
    expect(await verifySessionToken(parts.join("."))).toBeNull();
  });

  it("odbija podmetnut accountId (potpis pokriva i njega)", async () => {
    const token = await createSessionToken(ACCOUNT);
    const [, expires, signature] = token.split(".");
    const forged = `22222222-2222-2222-2222-222222222222.${expires}.${signature}`;
    expect(await verifySessionToken(forged)).toBeNull();
  });

  it("odbija prazan i besmislen token", async () => {
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
    expect(await verifySessionToken("nesto")).toBeNull();
  });
});

describe("stari token bez identiteta", () => {
  // Prijelazna kompatibilnost: cookieji izdani prije multi-tenancyja imaju
  // oblik `<expiry>.<potpis>` i moraju se mapirati na legacy račun, da se pri
  // deployu nitko ne odjavi.
  async function legacyToken(expires: number) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(process.env.AUTH_SECRET ?? "bela-tracker-dev-secret-change-me"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(String(expires)));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `${expires}.${hex}`;
  }

  it("mapira se na legacy račun kad je LEGACY_ACCOUNT_ID postavljen", async () => {
    process.env.LEGACY_ACCOUNT_ID = LEGACY;
    const token = await legacyToken(Date.now() + 60_000);
    expect(await verifySessionToken(token)).toEqual({ accountId: LEGACY });
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
