import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  SESSION_DURATION_MS,
  checkCredentials,
  createSessionToken,
} from "@/utils/auth";
import { rateLimit } from "@/lib/rateLimit";

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  // Ublažavanje brute-force napada na zajedničku lozinku: max 8 pokušaja / 10 min
  // po IP-u.
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

  let body: { username?: unknown; password?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!checkCredentials(username, password)) {
    // Kratka odgoda dodatno usporava automatsko pogađanje.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json(
      { error: "Neispravno korisničko ime ili lozinka" },
      { status: 401 },
    );
  }

  const token = await createSessionToken();
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
