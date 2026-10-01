import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { revalidateTag, unstable_cache } from "next/cache";
import { AUTH_COOKIE, passwordVersion, verifySessionToken } from "@/utils/auth";
import { findAccountCredentialsById } from "@/lib/accounts";

// Proxy (proxy.ts) je samo prvi filtar; Next dokumentacija izričito upozorava da
// ne smije biti jedini sloj autorizacije. Zato svaka ruta i server komponenta
// same razrješavaju račun iz cookieja preko ovih helpera.

function accountTag(accountId: string) {
  return `account:${accountId}`;
}

/**
 * Otisak trenutne lozinke računa. Keširan, jer se provjerava na svakom zahtjevu,
 * a mijenja se samo kroz promjenu lozinke, koja ga odmah invalidira
 * ({@link invalidateSessions}). `null` ako račun više ne postoji.
 */
function currentPasswordVersion(accountId: string) {
  return unstable_cache(
    async () => {
      const account = await findAccountCredentialsById(accountId);
      return account ? passwordVersion(account.passwordHash) : null;
    },
    ["password-version", accountId],
    { revalidate: 3600, tags: [accountTag(accountId)] },
  )();
}

/** Nakon promjene lozinke: stari tokeni prestaju vrijediti već na sljedećem zahtjevu. */
export function invalidateSessions(accountId: string) {
  revalidateTag(accountTag(accountId), { expire: 0 });
}

// cache(): layout, stranica i komponente u istom renderu dijele jednu provjeru.
export const getSessionAccountId = cache(async (): Promise<string | null> => {
  const store = await cookies();
  const session = await verifySessionToken(store.get(AUTH_COOKIE)?.value);
  if (!session) return null;
  // Proxy provjerava samo potpis; ovdje se odbijaju i tokeni izdani prije
  // zadnje promjene lozinke.
  if (session.passwordVersion !== null) {
    if (session.passwordVersion !== (await currentPasswordVersion(session.accountId))) return null;
  }
  return session.accountId;
});

/** Za server komponente: bez sesije šalje na prijavu. */
export async function requireAccountId(): Promise<string> {
  const accountId = await getSessionAccountId();
  if (!accountId) redirect("/login");
  return accountId;
}

export function unauthorized() {
  return NextResponse.json({ error: "Neautorizirano" }, { status: 401 });
}
