import { NextResponse } from "next/server";
import { AUTH_COOKIE, SESSION_DURATION_MS, createSessionToken, hashPassword } from "@/utils/auth";
import { UsernameTakenError, createAccount } from "@/lib/accounts";
import { rateLimit } from "@/lib/rateLimit";
import { registerSchema } from "@/lib/validation";

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  // Registracija je otvorena svima, pa je limit stroži nego kod prijave.
  const limited = rateLimit(`register:${clientIp(request)}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Previše pokušaja registracije. Pokušajte ponovno kasnije." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds) },
      },
    );
  }

  const parsed = registerSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Neispravan unos";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  let accountId: string;
  try {
    const account = await createAccount(parsed.data.username, passwordHash);
    accountId = account.id;
  } catch (error) {
    if (error instanceof UsernameTakenError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }

  // Nova grupa kreće prazna — igrače dodaje sama kroz "Nova partija".
  const token = await createSessionToken(accountId);
  const response = NextResponse.json({ ok: true }, { status: 201 });
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
  return response;
}
