import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getRepo } from "@/lib/supabase";
import { statsTag } from "@/lib/cachedStats";
import { getSessionAccountId, unauthorized } from "@/lib/session";
import { getGameScore, getWinningTeam } from "@/lib/scoring";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();
  const repo = getRepo(accountId);
  const game = await repo.getGame(id);

  if (!game) {
    return NextResponse.json({ error: "Partija nije pronađena" }, { status: 404 });
  }

  const rounds = await repo.listRounds(id);
  const score = getGameScore(rounds);

  return NextResponse.json({
    game,
    rounds,
    score,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();
  const repo = getRepo(accountId);
  const game = await repo.getGame(id);
  if (!game) {
    return NextResponse.json({ error: "Partija nije pronađena" }, { status: 404 });
  }
  const rounds = await repo.listRounds(id);
  const score = getGameScore(rounds);
  const winner = getWinningTeam(score);
  if (game.finishedAt || winner) {
    return NextResponse.json(
      { error: "Završene partije nije moguće obrisati s ove stranice." },
      { status: 400 },
    );
  }
  await repo.deleteGame(id);
  revalidateTag(statsTag(accountId), "max");
  return NextResponse.json({ ok: true });
}
