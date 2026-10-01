import { NextResponse } from "next/server";
import { getRepo } from "@/lib/supabase";
import { getSessionAccountId, unauthorized } from "@/lib/session";
import { createPlayerSchema } from "@/lib/validation";
import { invalidateStats } from "@/lib/cachedStats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();
  const repo = getRepo(accountId);
  const players = await repo.listPlayers();
  return NextResponse.json(
    { players },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    },
  );
}

export async function POST(request: Request) {
  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();

  const parsed = createPlayerSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Neispravan payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const repo = getRepo(accountId);
  const player = await repo.createPlayer(parsed.data.username);
  // Cachirani dataset drži popis igrača; bez ovoga bi /players/<novi> do 30 s
  // vraćao 404.
  invalidateStats(accountId, { immediate: true });
  return NextResponse.json({ player }, { status: 201 });
}
