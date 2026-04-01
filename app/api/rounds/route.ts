import { NextResponse } from "next/server";
import { getRepo } from "@/lib/supabase";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { createRoundSchema } from "@/lib/validation";

function isAllowedZvanjaTotal(total: number) {
  for (let count200 = 0; count200 <= 1; count200 += 1) {
    for (let count150 = 0; count150 <= 1; count150 += 1) {
      for (let count100 = 0; count100 <= 7; count100 += 1) {
        for (let count50 = 0; count50 <= 14; count50 += 1) {
          for (let count20 = 0; count20 <= 35; count20 += 1) {
            const sum =
              count20 * 20 +
              count50 * 50 +
              count100 * 100 +
              count150 * 150 +
              count200 * 200;
            if (sum === total) return true;
          }
        }
      }
    }
  }
  return false;
}

export async function POST(request: Request) {
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

  if (!isAllowedZvanjaTotal(parsed.data.zvanjaTeamA)) {
    return NextResponse.json(
      { error: "Zvanja za Tim A moraju biti kombinacija 20, 50, 100, 150 i 200" },
      { status: 400 },
    );
  }

  if (!isAllowedZvanjaTotal(parsed.data.zvanjaTeamB)) {
    return NextResponse.json(
      { error: "Zvanja za Tim B moraju biti kombinacija 20, 50, 100, 150 i 200" },
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

  const repo = getRepo();
  const game = await repo.getGame(parsed.data.gameId);
  if (!game) {
    return NextResponse.json({ error: "Partija nije pronađena" }, { status: 404 });
  }

  const existingRounds = await repo.listRounds(game.id);
  const existingScore = getGameScore(existingRounds);
  const existingWinner = getWinningTeam(existingScore);
  if (game.finishedAt || existingWinner) {
    return NextResponse.json(
      { error: "Partija je završena. Nije moguće upisati novu ruku." },
      { status: 400 },
    );
  }

  const teamAPlayers = new Set(game.teams.teamA);
  const teamBPlayers = new Set(game.teams.teamB);
  const zvanjaByPlayerA = parsed.data.zvanjaByPlayerA ?? [];
  const zvanjaByPlayerB = parsed.data.zvanjaByPlayerB ?? [];
  const totalByPlayerA = zvanjaByPlayerA.reduce((sum, entry) => sum + entry.points, 0);
  const totalByPlayerB = zvanjaByPlayerB.reduce((sum, entry) => sum + entry.points, 0);

  if (totalByPlayerA !== parsed.data.zvanjaTeamA) {
    return NextResponse.json(
      { error: "Zbroj zvanja po igračima za Tim A mora odgovarati ukupnom zvanju tima" },
      { status: 400 },
    );
  }

  if (totalByPlayerB !== parsed.data.zvanjaTeamB) {
    return NextResponse.json(
      { error: "Zbroj zvanja po igračima za Tim B mora odgovarati ukupnom zvanju tima" },
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

  const round = await repo.createRound(parsed.data);
  const roundsAfterInsert = await repo.listRounds(game.id);
  const scoreAfterInsert = getGameScore(roundsAfterInsert);
  const winnerTeam = getWinningTeam(scoreAfterInsert);
  if (winnerTeam) {
    await repo.finishGame(game.id);
  }

  return NextResponse.json(
    { round, gameFinished: Boolean(winnerTeam), winnerTeam, score: scoreAfterInsert },
    { status: 201 },
  );
}
