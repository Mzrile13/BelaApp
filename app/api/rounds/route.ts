import { NextResponse } from "next/server";
import { getRepo } from "@/lib/supabase";
import { getSessionAccountId, unauthorized } from "@/lib/session";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { invalidateStats } from "@/lib/cachedStats";
import { createRoundSchema } from "@/lib/validation";
import { validateRoundInput } from "@/lib/roundValidation";

export async function POST(request: Request) {
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

  const invalid = validateRoundInput(parsed.data, game);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  // Partija i njezine ruke su gore već dohvaćene; prosljeđujemo ih repozitoriju
  // i rezultat računamo lokalno, umjesto da isti SELECT ide još dva puta.
  let round;
  try {
    round = await repo.createRound(parsed.data, { game, existingRounds });
  } catch (error) {
    // Unique (game_id, round_number): netko je s drugog uređaja upravo upisao
    // ruku s istim rednim brojem. Ponovni pokušaj bi istu ruku upisao dvaput.
    if ((error as { code?: string } | null)?.code === "23505") {
      return NextResponse.json(
        { error: "Ruku je upravo upisao netko drugi. Osvježi partiju prije novog upisa." },
        { status: 409 },
      );
    }
    throw error;
  }
  const scoreAfterInsert = getGameScore([...existingRounds, round]);
  const winnerTeam = getWinningTeam(scoreAfterInsert);
  if (winnerTeam) {
    await repo.finishGame(game.id);
  }
  invalidateStats(accountId, { immediate: Boolean(winnerTeam) });

  return NextResponse.json(
    { round, gameFinished: Boolean(winnerTeam), winnerTeam, score: scoreAfterInsert },
    { status: 201 },
  );
}
