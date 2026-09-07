import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  SESSION_DURATION_MS,
  createSessionToken,
  verifyPassword,
} from "@/utils/auth";
import { findAccountCredentials } from "@/lib/accounts";
import { rateLimit } from "@/lib/rateLimit";
import { loginSchema } from "@/lib/validation";

// Hash koji sigurno ne odgovara nijednoj lozinci. Kad račun ne postoji svejedno
// odradimo jedan puni PBKDF2, pa trajanje odgovora ne odaje postoji li ime.
const DUMMY_HASH =
  "pbkdf2$sha256$210000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  // Ublažavanje brute-force napada: max 8 pokušaja / 10 min po IP-u.
  const limited = rateLimit(`login:${clientIp(request)}`, {
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Previše pokušaja prijave. Pokušajte ponovno kasnije." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds) },
      },
    );
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => ({})));
  const username = parsed.success ? parsed.data.username : "";
  const password = parsed.success ? parsed.data.password : "";

  const account = username ? await findAccountCredentials(username) : null;
  const passwordOk = await verifyPassword(password, account?.passwordHash ?? DUMMY_HASH);

  if (!account || !passwordOk) {
    // Kratka odgoda dodatno usporava automatsko pogađanje. Ista poruka za
    // nepostojeći račun i krivu lozinku — da se ne otkriva koja imena postoje.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json(
      { error: "Neispravno korisničko ime ili lozinka" },
      { status: 401 },
    );
  }

  const token = await createSessionToken(account.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
