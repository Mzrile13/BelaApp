import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getRepo } from "@/lib/supabase";
import { getSessionAccountId, unauthorized } from "@/lib/session";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { statsTag } from "@/lib/cachedStats";
import { createRoundSchema, isAllowedZvanjaTotal } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = createRoundSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Neispravan payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.pointsTeamA + parsed.data.pointsTeamB > 162) {
    return NextResponse.json(
      { error: "Zbroj bodova iz čiste igre ne može biti veći od 162" },
      { status: 400 },
    );
  }

  if (!isAllowedZvanjaTotal(parsed.data.zvanjaTeamA) || !isAllowedZvanjaTotal(parsed.data.zvanjaTeamB)) {
    return NextResponse.json(
      { error: "Zvanja moraju biti kombinacija 20, 50, 100, 150 i 200" },
      { status: 400 },
    );
  }

  if (parsed.data.stigliaTeam === "A" && parsed.data.pointsTeamA !== 162) {
    return NextResponse.json(
      { error: "Štiglja Tim A je moguća samo kad Tim A uzme svih 162 čista boda" },
      { status: 400 },
    );
  }
  if (parsed.data.stigliaTeam === "B" && parsed.data.pointsTeamB !== 162) {
    return NextResponse.json(
      { error: "Štiglja Tim B je moguća samo kad Tim B uzme svih 162 čista boda" },
      { status: 400 },
    );
  }

  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();
  const repo = getRepo(accountId);
  const [game, existingRounds] = await Promise.all([
    repo.getGame(parsed.data.gameId),
    repo.listRounds(parsed.data.gameId),
  ]);
  if (!game) {
    return NextResponse.json({ error: "Partija nije pronađena" }, { status: 404 });
  }

  const teamAPlayers = new Set(game.teams.teamA);
  const teamBPlayers = new Set(game.teams.teamB);
  const zvanjaByPlayerA = parsed.data.zvanjaByPlayerA ?? [];
  const zvanjaByPlayerB = parsed.data.zvanjaByPlayerB ?? [];
  const totalByPlayerA = zvanjaByPlayerA.reduce((sum, entry) => sum + entry.points, 0);
  const totalByPlayerB = zvanjaByPlayerB.reduce((sum, entry) => sum + entry.points, 0);

  if (totalByPlayerA !== parsed.data.zvanjaTeamA || totalByPlayerB !== parsed.data.zvanjaTeamB) {
    return NextResponse.json(
      { error: "Zbroj zvanja po igračima mora odgovarati ukupnom zvanju tima" },
      { status: 400 },
    );
  }

  for (const entry of zvanjaByPlayerA) {
    if (!teamAPlayers.has(entry.playerId)) {
      return NextResponse.json(
        { error: "Svi igrači zvanja za Tim A moraju biti iz Tima A" },
        { status: 400 },
      );
    }
    if (!isAllowedZvanjaTotal(entry.points)) {
      return NextResponse.json(
        { error: "Zvanja pojedinog igrača (Tim A) moraju biti kombinacija 20, 50, 100, 150 i 200" },
        { status: 400 },
      );
    }
  }

  for (const entry of zvanjaByPlayerB) {
    if (!teamBPlayers.has(entry.playerId)) {
      return NextResponse.json(
        { error: "Svi igrači zvanja za Tim B moraju biti iz Tima B" },
        { status: 400 },
      );
    }
    if (!isAllowedZvanjaTotal(entry.points)) {
      return NextResponse.json(
        { error: "Zvanja pojedinog igrača (Tim B) moraju biti kombinacija 20, 50, 100, 150 i 200" },
        { status: 400 },
      );
    }
  }

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
  revalidateTag(statsTag(accountId), "max");

  return NextResponse.json(
    { round, gameFinished: Boolean(winnerTeam), winnerTeam, score: scoreAfterUpdate },
    { status: 200 },
  );
}
