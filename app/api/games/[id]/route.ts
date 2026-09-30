import { NextResponse } from "next/server";
import { getRepo } from "@/lib/supabase";
import { invalidateStats } from "@/lib/cachedStats";
import { getSessionAccountId, unauthorized } from "@/lib/session";
import { gameCommentSchema } from "@/lib/validation";
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
  invalidateStats(accountId);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsed = gameCommentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Neispravan payload" },
      { status: 400 },
    );
  }
  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();
  const repo = getRepo(accountId);
  const [game, rounds] = await Promise.all([repo.getGame(id), repo.listRounds(id)]);
  if (!game) {
    return NextResponse.json({ error: "Partija nije pronađena" }, { status: 404 });
  }
  if (!game.finishedAt && !getWinningTeam(getGameScore(rounds))) {
    return NextResponse.json(
      { error: "Komentar se može dodati tek kad je partija završena." },
      { status: 400 },
    );
  }
  const comment = parsed.data.comment || null;
  try {
    await repo.setGameComment(id, comment);
  } catch {
    return NextResponse.json({ error: "Komentar trenutno nije moguće spremiti." }, { status: 500 });
  }
  return NextResponse.json({ comment });
}
