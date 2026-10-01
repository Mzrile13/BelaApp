import { NextResponse } from "next/server";
import { getRepo } from "@/lib/supabase";
import { getSessionAccountId, unauthorized } from "@/lib/session";
import { groupNameSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
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
    const group = await repo.renameGroup(id, name);
    return NextResponse.json({ group });
  } catch {
    return NextResponse.json({ error: "Greška pri promjeni naziva grupe" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();
  const repo = getRepo(accountId);
  try {
    await repo.deleteGroup(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Greška pri brisanju grupe" }, { status: 500 });
  }
}
