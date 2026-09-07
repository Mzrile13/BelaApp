import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  SESSION_DURATION_MS,
  createSessionToken,
  hashPassword,
  verifyPassword,
} from "@/utils/auth";
import { findAccountCredentialsById, updateAccountPassword } from "@/lib/accounts";
import { rateLimit } from "@/lib/rateLimit";
import { getSessionAccountId, unauthorized } from "@/lib/session";
import { changePasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();

  // Limitiramo po računu: promjena lozinke traži staru lozinku, pa je ovo brana
  // protiv pogađanja s već preuzetog uređaja.
  const limited = rateLimit(`password:${accountId}`, {
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Previše pokušaja. Pokušajte ponovno kasnije." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSeconds) },
      },
    );
  }

  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Neispravan unos";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const account = await findAccountCredentialsById(accountId);
  if (!account) return unauthorized();

  if (!(await verifyPassword(parsed.data.currentPassword, account.passwordHash))) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json({ error: "Trenutna lozinka nije točna" }, { status: 401 });
  }

  await updateAccountPassword(accountId, await hashPassword(parsed.data.newPassword));

  // Svjež token: sesija ostaje aktivna i produžuje se, umjesto da se korisnik
  // nakon promjene lozinke mora ponovno prijaviti.
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, await createSessionToken(accountId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
  return response;
}
