import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase";

// Račun = jedna grupa prijatelja. Jedan dijeljeni username i lozinka; svi igrači,
// partije i statistika vise o njegovom id-u.

export interface Account {
  id: string;
  username: string;
  createdAt: string;
}

export interface AccountCredentials {
  id: string;
  passwordHash: string;
}

/** Baca se kad je korisničko ime već zauzeto (uključujući utrku na unique indexu). */
export class UsernameTakenError extends Error {
  constructor() {
    super("Korisničko ime je već zauzeto");
    this.name = "UsernameTakenError";
  }
}

// Dev fallback kad Supabase env varijable nisu postavljene — isti obrazac kao
// FileRepo u lib/supabase.ts.
const devDbPath = path.join(process.cwd(), ".data", "bela-accounts.json");

interface DevAccount extends Account {
  usernameLc: string;
  passwordHash: string;
}

async function readDevAccounts(): Promise<DevAccount[]> {
  try {
    return JSON.parse(await readFile(devDbPath, "utf-8")) as DevAccount[];
  } catch {
    return [];
  }
}

async function writeDevAccounts(accounts: DevAccount[]) {
  await mkdir(path.dirname(devDbPath), { recursive: true });
  await writeFile(devDbPath, JSON.stringify(accounts, null, 2), "utf-8");
}

export async function findAccountCredentials(
  username: string,
): Promise<AccountCredentials | null> {
  const usernameLc = username.trim().toLowerCase();
  if (!usernameLc) return null;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const account = (await readDevAccounts()).find((row) => row.usernameLc === usernameLc);
    return account ? { id: account.id, passwordHash: account.passwordHash } : null;
  }

  // username_lc je generirani stupac (migracija 008) — PostgREST ne zna
  // filtrirati po lower(username), a ovako upit koristi unique indeks.
  const { data, error } = await supabase
    .from("accounts")
    .select("id, password_hash")
    .eq("username_lc", usernameLc)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, passwordHash: data.password_hash };
}

export async function createAccount(username: string, passwordHash: string): Promise<Account> {
  const trimmed = username.trim();
  const usernameLc = trimmed.toLowerCase();

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const accounts = await readDevAccounts();
    if (accounts.some((row) => row.usernameLc === usernameLc)) throw new UsernameTakenError();
    const account: DevAccount = {
      id: crypto.randomUUID(),
      username: trimmed,
      usernameLc,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    accounts.push(account);
    await writeDevAccounts(accounts);
    return { id: account.id, username: account.username, createdAt: account.createdAt };
  }

  const { data, error } = await supabase
    .from("accounts")
    .insert({ username: trimmed, password_hash: passwordHash })
    .select("id, username, created_at")
    .single();

  // 23505 = unique violation na accounts_username_lc_key; hvata i utrku između
  // provjere i inserta.
  if (error?.code === "23505") throw new UsernameTakenError();
  if (error) throw error;
  return { id: data.id, username: data.username, createdAt: data.created_at };
}
