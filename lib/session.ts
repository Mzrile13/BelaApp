import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, verifySessionToken } from "@/utils/auth";

// Proxy (proxy.ts) je samo prvi filtar; Next dokumentacija izričito upozorava da
// ne smije biti jedini sloj autorizacije. Zato svaka ruta i server komponenta
// same razrješavaju račun iz cookieja preko ovih helpera.

export async function getSessionAccountId(): Promise<string | null> {
  const store = await cookies();
  const session = await verifySessionToken(store.get(AUTH_COOKIE)?.value);
  return session?.accountId ?? null;
}

/** Za server komponente: bez sesije šalje na prijavu. */
export async function requireAccountId(): Promise<string> {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/login");
  return accountId;
}

export function unauthorized() {
  return NextResponse.json({ error: "Neautorizirano" }, { status: 401 });
}
