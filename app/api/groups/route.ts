import { NextResponse } from "next/server";
import { getRepo } from "@/lib/supabase";
import { getSessionAccountId, unauthorized } from "@/lib/session";
import { groupNameSchema } from "@/lib/validation";

export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();
  const repo = getRepo(accountId);
  const [groups, members] = await Promise.all([repo.listGroups(), repo.listAllGroupMembers()]);
  return NextResponse.json({ groups, members });
}

export async function POST(request: Request) {
  const parsed = groupNameSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message ?? "Neispravan naziv grupe";
    return NextResponse.json({ error }, { status: 400 });
  }
  const { name } = parsed.data;
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
