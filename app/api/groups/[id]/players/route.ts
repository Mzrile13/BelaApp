import { NextResponse } from "next/server";
import { getRepo } from "@/lib/supabase";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const repo = getRepo();
  const players = await repo.listGroupPlayers(id);
  return NextResponse.json({ players });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { playerId?: string };
  if (!body.playerId) {
    return NextResponse.json({ error: "Nedostaje playerId" }, { status: 400 });
  }
  const repo = getRepo();
  try {
    await repo.addPlayerToGroup(id, body.playerId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Greška pri dodavanju igrača u grupu" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { playerId?: string };
  if (!body.playerId) {
    return NextResponse.json({ error: "Nedostaje playerId" }, { status: 400 });
  }
  const repo = getRepo();
  try {
    await repo.removePlayerFromGroup(id, body.playerId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Greška pri brisanju igrača iz grupe" }, { status: 500 });
  }
}
