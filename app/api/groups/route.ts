import { NextResponse } from "next/server";
import { getRepo } from "@/lib/supabase";
import { getSessionAccountId, unauthorized } from "@/lib/session";

export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();
  const repo = getRepo(accountId);
  const [groups, members] = await Promise.all([repo.listGroups(), repo.listAllGroupMembers()]);
  return NextResponse.json({ groups, members });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Naziv grupe mora imati barem 2 znaka" }, { status: 400 });
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();
  const repo = getRepo(accountId);
  try {
    const group = await repo.createGroup(name);
    return NextResponse.json({ group }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Greška pri kreiranju grupe" }, { status: 500 });
  }
}
