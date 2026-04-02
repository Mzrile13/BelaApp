import { NextResponse } from "next/server";
import { getRepo } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Naziv grupe mora imati barem 2 znaka" }, { status: 400 });
  }
  const repo = getRepo();
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
  const repo = getRepo();
  try {
    await repo.deleteGroup(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Greška pri brisanju grupe" }, { status: 500 });
  }
}
