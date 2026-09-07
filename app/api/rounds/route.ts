import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getRepo } from "@/lib/supabase";
import { getSessionAccountId, unauthorized } from "@/lib/session";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { statsTag } from "@/lib/cachedStats";
import { createRoundSchema, isAllowedZvanjaTotal } from "@/lib/validation";

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

  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();
  const repo = getRepo(accountId);
  // Oba upita su neovisna i oba su svakako potrebna — idu paralelno umjesto u nizu.
  // `listRounds` je već ograničen na account_id, pa ne curi ništa ako partija ne postoji.
  const [game, existingRounds] = await Promise.all([
    repo.getGame(parsed.data.gameId),
    repo.listRounds(parsed.data.gameId),
  ]);
  if (!game) {
    return NextResponse.json({ error: "Partija nije pronađena" }, { status: 404 });
  }

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

  // Partija i njezine ruke su gore već dohvaćene; prosljeđujemo ih repozitoriju
  // i rezultat računamo lokalno, umjesto da isti SELECT ide još dva puta.
  const round = await repo.createRound(parsed.data, { game, existingRounds });
  const scoreAfterInsert = getGameScore([...existingRounds, round]);
  const winnerTeam = getWinningTeam(scoreAfterInsert);
  if (winnerTeam) {
    await repo.finishGame(game.id);
  }
  revalidateTag(statsTag(accountId), "max");

  return NextResponse.json(
    { round, gameFinished: Boolean(winnerTeam), winnerTeam, score: scoreAfterInsert },
    { status: 201 },
  );
}
