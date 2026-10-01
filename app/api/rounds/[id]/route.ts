import { NextResponse } from "next/server";
import { getRepo } from "@/lib/supabase";
import { getSessionAccountId, unauthorized } from "@/lib/session";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { invalidateStats } from "@/lib/cachedStats";
import { createRoundSchema } from "@/lib/validation";
import { validateRoundInput } from "@/lib/roundValidation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();

  const parsed = createRoundSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Neispravan payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const repo = getRepo(accountId);
  const [game, existingRounds] = await Promise.all([
    repo.getGame(parsed.data.gameId),
    repo.listRounds(parsed.data.gameId),
  ]);
  if (!game) {
    return NextResponse.json({ error: "Partija nije pronađena" }, { status: 404 });
  }
  if (!existingRounds.some((round) => round.id === id)) {
    return NextResponse.json({ error: "Ruka nije pronađena" }, { status: 404 });
  }

  const invalid = validateRoundInput(parsed.data, game);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  // Ruke su gore već dohvaćene: repozitorij ih dobiva umjesto da ih čita opet,
  // a novi rezultat se sklopi lokalno zamjenom izmijenjene ruke.
  const round = await repo.updateRound(id, parsed.data, { game, existingRounds });
  const roundsAfterUpdate = existingRounds.map((row) => (row.id === round.id ? round : row));
  const scoreAfterUpdate = getGameScore(roundsAfterUpdate);
  const winnerTeam = getWinningTeam(scoreAfterUpdate);
  if (winnerTeam) {
    await repo.finishGame(game.id);
  } else {
    await repo.reopenGame(game.id);
  }
  // Izmjena ruke u završenoj (ili sada završenoj) partiji mijenja statistiku.
  invalidateStats(accountId, { immediate: Boolean(winnerTeam || game.finishedAt) });

  return NextResponse.json(
    { round, gameFinished: Boolean(winnerTeam), winnerTeam, score: scoreAfterUpdate },
    { status: 200 },
  );
}
