import type { PairStats, PlayerStats } from "@/lib/types";
import { BEST_PARTNER_MIN_GAMES, HEAD_TO_HEAD_MIN_GAMES, PROVISIONAL_PLAYER_GAMES } from "./constants";
import { avg, round, stdDev } from "./math";
import type { BuildContext } from "./pairs";
import { getCurrentStreak, outcomeLetters, streakExtremes, trendFromForm } from "./trends";
import type { HeadToHead, PlayerAcc } from "./types";
import { topSuit } from "./zvanja";

export function buildPlayerRows(
  playerAccs: Iterable<PlayerAcc>,
  pairs: PairStats[],
  headToHead: Map<string, Map<string, HeadToHead>>,
  ctx: BuildContext,
): PlayerStats[] {
  const { rating, usernameById } = ctx;
const pairsByPlayer = new Map<string, PairStats[]>();
for (const pair of pairs) {
  for (const playerId of [pair.playerAId, pair.playerBId]) {
    const bucket = pairsByPlayer.get(playerId) ?? [];
    bucket.push(pair);
    pairsByPlayer.set(playerId, bucket);
  }
}

return Array.from(playerAccs).map((acc) => {
  const playerId = acc.player.id;
  const playerRating = rating.byPlayer.get(playerId);
  const ratingValue = playerRating?.rating ?? rating.config.initialRating;
  const sigma = playerRating?.sigma ?? rating.config.sigmaBase;
  const formDelta = playerRating?.formDelta ?? 0;
  const { bestWinStreak, worstLossStreak } = streakExtremes(acc.outcomes);

  const bestPartner = (pairsByPlayer.get(playerId) ?? [])
    .filter((pair) => pair.gamesTogether >= BEST_PARTNER_MIN_GAMES)
    .sort((a, b) => b.chemistry - a.chemistry)[0];
  const partnerId = bestPartner
    ? bestPartner.playerAId === playerId
      ? bestPartner.playerBId
      : bestPartner.playerAId
    : null;

  const opponents = Array.from(headToHead.get(playerId) ?? new Map())
    .filter(([, record]) => record.games >= HEAD_TO_HEAD_MIN_GAMES)
    .map(([opponentId, record]) => ({
      opponentId,
      delta: (record.wins - record.expectedWins) / record.games,
    }))
    .sort((a, b) => a.delta - b.delta);
  const nemesis = opponents[0] ?? null;
  const favourite = opponents.length ? opponents[opponents.length - 1] : null;

  return {
    playerId,
    username: acc.player.username,
    rating: round(ratingValue, 1),
    conservativeRating: round(ratingValue - sigma, 1),
    sigma: round(sigma, 1),
    confidence: round(playerRating?.confidence ?? 0, 3),
    provisional: acc.gamesPlayed < PROVISIONAL_PLAYER_GAMES,
    peakRating: round(playerRating?.peakRating ?? ratingValue, 1),
    formDelta: round(formDelta, 1),
    seasonDelta: round(playerRating?.seasonDelta ?? 0, 1),
    ratingTrail: (playerRating?.trail ?? []).map((value) => round(value, 1)),
    roundsPlayed: acc.roundsPlayed,
    gamesPlayed: acc.gamesPlayed,
    gamesWon: acc.gamesWon,
    pointsWon: acc.pointsWon,
    pointsAgainst: acc.pointsAgainst,
    avgPoints: round(avg(acc.pointsPerRound)),
    zvanjaTotal: acc.zvanjaTotal,
    stigliaCount: acc.stigliaCount,
    avgZvanja: round(acc.gamesPlayed ? acc.zvanjaTotal / acc.gamesPlayed : 0),
    timesCalled: acc.timesCalled,
    callsPerRoundAvg: round(acc.roundsPlayed ? acc.timesCalled / acc.roundsPlayed : 0, 3),
    voluntaryCalls: acc.voluntaryCalls,
    forcedCalls: acc.forcedCalls,
    voluntaryCallRate: round(
      acc.voluntaryOpportunities ? acc.voluntaryCalls / acc.voluntaryOpportunities : 0,
      3,
    ),
    callerSuccessRate: round(acc.timesCalled ? acc.callerSuccesses / acc.timesCalled : 0, 3),
    voluntaryCallerSuccessRate: round(
      acc.voluntaryCalls ? acc.voluntarySuccesses / acc.voluntaryCalls : 0,
      3,
    ),
    forcedCallerSuccessRate: round(
      acc.forcedCalls ? acc.forcedSuccesses / acc.forcedCalls : 0,
      3,
    ),
    callValueAdded: round(acc.gamesPlayed ? acc.callValueAdded / acc.gamesPlayed : 0, 1),
    callValueAddedPerCall: round(acc.timesCalled ? acc.callValueAdded / acc.timesCalled : 0, 1),
    favoriteCalledSuit: topSuit(acc.calledSuitCounter),
    avgPointsWhenCalling: round(avg(acc.callPoints)),
    avgPointsWhenNotCalling: round(avg(acc.noCallPoints)),
    netPerRound: round(
      acc.roundsPlayed ? (acc.pointsWon - acc.pointsAgainst) / acc.roundsPlayed : 0,
    ),
    positiveRoundRate: round(
      acc.roundsPlayed ? acc.positiveRounds / acc.roundsPlayed : 0,
      3,
    ),
    consistencyIndex: round(stdDev(acc.pointsPerRound)),
    biggestRound: acc.biggestRound,
    biggestComeback: round(acc.biggestComeback),
    clutchIndex: round(acc.clutchTotal ? acc.clutchHits / acc.clutchTotal : 0, 3),
    clutchRounds: acc.clutchTotal,
    currentStreak: getCurrentStreak(acc.outcomes),
    bestWinStreak,
    worstLossStreak,
    trend: trendFromForm(formDelta),
    // Runde su sada kronološke (partija po partija), pa "zadnjih 5" stvarno
    // znači zadnjih 5. Prije su sve runde svih partija bile sortirane samo po
    // rednom broju runde, pa je "forma" bila rep najduljih partija.
    avgLast5: round(avg(acc.pointsPerRound.slice(-5))),
    avgLast10: round(avg(acc.pointsPerRound.slice(-10))),
    last5GameResults: outcomeLetters(acc.outcomes, 5),
    last10GameResults: outcomeLetters(acc.outcomes, 10),
    bestPartnerUsername: partnerId ? usernameById.get(partnerId) ?? null : null,
    bestPartnerChemistry: bestPartner?.chemistry ?? 0,
    nemesisUsername: nemesis ? usernameById.get(nemesis.opponentId) ?? null : null,
    nemesisDelta: nemesis ? round(nemesis.delta, 3) : 0,
    favouriteOpponentUsername: favourite
      ? usernameById.get(favourite.opponentId) ?? null
      : null,
    favouriteOpponentDelta: favourite ? round(favourite.delta, 3) : 0,
  } satisfies PlayerStats;
});
}
