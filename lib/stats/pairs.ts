import type { RatingResult } from "@/lib/rating";
import type { PairStats } from "@/lib/types";
import { CHEMISTRY_SHRINK_GAMES, PROVISIONAL_PAIR_GAMES } from "./constants";
import { avg, round } from "./math";
import { getCurrentStreak, outcomeLetters, streakExtremes, trendFromForm } from "./trends";
import type { PairAcc } from "./types";
import { topSuit } from "./zvanja";

export interface BuildContext {
  rating: RatingResult;
  ratingOf: (playerId: string) => number;
  usernameById: Map<string, string>;
}

/** Parovi: kemija u odnosu na ono što rejtinzi predviđaju. */
export function buildPairRows(pairAccs: Iterable<PairAcc>, ctx: BuildContext): PairStats[] {
  const { rating, ratingOf, usernameById } = ctx;
return Array.from(pairAccs).map((acc) => {
  const winRate = acc.gamesTogether ? acc.winsTogether / acc.gamesTogether : 0;
  const expectedWinRate = acc.gamesTogether ? acc.expectedWins / acc.gamesTogether : 0;
  const chemistryRaw = winRate - expectedWinRate;
  const confidence = acc.gamesTogether / (acc.gamesTogether + CHEMISTRY_SHRINK_GAMES);
  const { bestWinStreak, worstLossStreak } = streakExtremes(acc.outcomes);
  const combinedRating = (ratingOf(acc.playerAId) + ratingOf(acc.playerBId)) / 2;
  const formDelta =
    (rating.byPlayer.get(acc.playerAId)?.formDelta ?? 0) / 2 +
    (rating.byPlayer.get(acc.playerBId)?.formDelta ?? 0) / 2;

  return {
    playerAId: acc.playerAId,
    playerBId: acc.playerBId,
    playerAUsername: usernameById.get(acc.playerAId) ?? "Unknown",
    playerBUsername: usernameById.get(acc.playerBId) ?? "Unknown",
    combinedRating: round(combinedRating, 1),
    expectedWinRate: round(expectedWinRate, 3),
    // Stiskanje prema 0: par s dvije zajedničke partije ne smije voditi
    // ljestvicu kemije samo zato što je oba puta iznenadio.
    chemistry: round(chemistryRaw * confidence, 3),
    chemistryRaw: round(chemistryRaw, 3),
    confidence: round(confidence, 3),
    provisional: acc.gamesTogether < PROVISIONAL_PAIR_GAMES,
    gamesTogether: acc.gamesTogether,
    winsTogether: acc.winsTogether,
    winRate: round(winRate, 3),
    roundsPlayed: acc.roundsPlayed,
    avgPoints: round(avg(acc.pointsPerRound)),
    avgPlusMinusPerGame: round(
      acc.gamesTogether ? (acc.pointsFor - acc.pointsAgainst) / acc.gamesTogether : 0,
    ),
    avgZvanja: round(acc.gamesTogether ? acc.zvanjaTotal / acc.gamesTogether : 0),
    stigliaCount: acc.stigliaCount,
    timesCalled: acc.timesCalled,
    voluntaryCalls: acc.voluntaryCalls,
    forcedCalls: acc.forcedCalls,
    favoriteCalledSuit: topSuit(acc.calledSuitCounter),
    callerSuccessRate: round(acc.timesCalled ? acc.callerSuccesses / acc.timesCalled : 0, 3),
    callValueAdded: round(acc.gamesTogether ? acc.callValueAdded / acc.gamesTogether : 0, 1),
    clutchIndex: round(acc.clutchTotal ? acc.clutchHits / acc.clutchTotal : 0, 3),
    clutchRounds: acc.clutchTotal,
    trend: trendFromForm(formDelta),
    callsPerRoundAvg: round(acc.roundsPlayed ? acc.timesCalled / acc.roundsPlayed : 0, 3),
    currentStreak: getCurrentStreak(acc.outcomes),
    bestWinStreak,
    worstLossStreak,
    last5GameResults: outcomeLetters(acc.outcomes, 5),
    last10GameResults: outcomeLetters(acc.outcomes, 10),
  } satisfies PairStats;
});
}
