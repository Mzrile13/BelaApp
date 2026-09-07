import { getDealerForRound } from "@/lib/dealer";
import { computeRatings, expectedScore, type RatingResult } from "@/lib/rating";
import { GAME_TARGET_SCORE, groupRoundsByGame, resolveRoundPoints } from "@/lib/scoring";
import type { CalledSuit, Game, PairStats, Player, PlayerStats, Round, TeamId } from "@/lib/types";

/**
 * Statistika se dijeli na dva sloja koja se namjerno ne miješaju:
 *
 *  - REJTING (lib/rating.ts) je jedini broj po kojem se rangira. Prijašnji
 *    `mvpScore` je bio ponderirani zbroj min-max normaliziranih komponenti, što
 *    je imalo tri fatalna svojstva: bio je relativan prema trenutnom sastavu
 *    ekipe (najgori uvijek 0, najbolji uvijek 1), komponente su mu bile
 *    međusobno jako korelirane (winRate, plus-minus, bodovi po ruci i clutch su
 *    sve varijante istog signala), i nije korigirao ni partnera ni protivnika.
 *  - KATEGORIJE (ovdje) su zasebne, samostalno čitljive metrike. Ne zbrajaju se
 *    u jedan broj; svaka ima svoju malu ljestvicu.
 */

/** Koliko zajedničkih partija treba da se kemija para prestane stiskati prema 0. */
const CHEMISTRY_SHRINK_GAMES = 6;
const PROVISIONAL_PLAYER_GAMES = 5;
const PROVISIONAL_PAIR_GAMES = 4;
/** Završnica partije: netko je blizu cilja, a razlika je još nadoknadiva. */
const CLUTCH_LEAD_THRESHOLD = 0.7 * GAME_TARGET_SCORE;
const CLUTCH_MARGIN_THRESHOLD = 0.15 * GAME_TARGET_SCORE;
const HEAD_TO_HEAD_MIN_GAMES = 3;
const BEST_PARTNER_MIN_GAMES = 3;
/** Promjena rejtinga (kroz zadnjih 10 partija) koja se računa kao forma. */
const TREND_THRESHOLD = 12;

function round(value: number, digits = 2) {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]) {
  if (!values.length) return 0;
  const mean = avg(values);
  return Math.sqrt(avg(values.map((value) => (value - mean) ** 2)));
}

function trendFromForm(formDelta: number): "hot" | "steady" | "cold" {
  if (formDelta > TREND_THRESHOLD) return "hot";
  if (formDelta < -TREND_THRESHOLD) return "cold";
  return "steady";
}

function outcomeLetters(outcomes: number[], count: number): Array<"W" | "L" | "D"> {
  return outcomes.slice(-count).map((outcome) => (outcome > 0 ? "W" : outcome < 0 ? "L" : "D"));
}

function getCurrentStreak(outcomes: number[]) {
  if (outcomes.length === 0) return 0;
  const last = outcomes[outcomes.length - 1];
  if (last === 0) return 0;
  const sign = last > 0 ? 1 : -1;
  let streak = 0;
  for (let i = outcomes.length - 1; i >= 0; i -= 1) {
    const value = outcomes[i];
    if (value === 0 || (value > 0 ? 1 : -1) !== sign) break;
    streak += 1;
  }
  return sign * streak;
}

function streakExtremes(outcomes: number[]) {
  let winStreak = 0;
  let lossStreak = 0;
  let bestWinStreak = 0;
  let worstLossStreak = 0;
  for (const outcome of outcomes) {
    if (outcome > 0) {
      winStreak += 1;
      lossStreak = 0;
    } else if (outcome < 0) {
      lossStreak += 1;
      winStreak = 0;
    } else {
      winStreak = 0;
      lossStreak = 0;
    }
    bestWinStreak = Math.max(bestWinStreak, winStreak);
    worstLossStreak = Math.max(worstLossStreak, lossStreak);
  }
  return { bestWinStreak, worstLossStreak };
}

function topSuit(counter: Record<CalledSuit, number>): CalledSuit | null {
  const best = (Object.entries(counter) as Array<[CalledSuit, number]>).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : null;
}

function emptySuitCounter(): Record<CalledSuit, number> {
  return { karo: 0, herc: 0, pik: 0, tref: 0 };
}

/** Zvanja koja je proglasio konkretno ovaj igrač (s fallbackom na stari, timski zapis). */
function zvanjaForPlayer(roundRow: Round, playerId: string) {
  const byPlayerA = roundRow.zvanjaByPlayerA ?? [];
  const byPlayerB = roundRow.zvanjaByPlayerB ?? [];
  if (byPlayerA.length || byPlayerB.length) {
    return [...byPlayerA, ...byPlayerB]
      .filter((entry) => entry.playerId === playerId)
      .reduce((sum, entry) => sum + entry.points, 0);
  }
  return (
    (roundRow.zvanjaPlayerIdA === playerId ? roundRow.zvanjaTeamA : 0) +
    (roundRow.zvanjaPlayerIdB === playerId ? roundRow.zvanjaTeamB : 0)
  );
}

/**
 * Runda s izvedenim kontekstom koji jedna runda sama o sebi ne zna: tko je te
 * ruke dijelio (a time i tko je zvao "iz mora") i je li se igralo u završnici.
 */
interface RoundContext {
  round: Round;
  pointsA: number;
  pointsB: number;
  /** Djelitelj te ruke; rotira unutar partije, vidi lib/dealer.ts. */
  dealerPlayerId: string;
  /** Zvao je djelitelj, tj. svi prije njega su dalje — zvanje nije bilo izbor. */
  forcedCall: boolean;
  /** Rezultat PRIJE ove ruke je bio u završnici. */
  clutch: boolean;
}

interface ScoredGameContext {
  game: Game;
  winner: TeamId | null;
  contexts: RoundContext[];
  expectedA: number;
}

interface PlayerAcc {
  player: Player;
  roundsPlayed: number;
  gamesPlayed: number;
  gamesWon: number;
  pointsWon: number;
  pointsAgainst: number;
  pointsPerRound: number[];
  positiveRounds: number;
  zvanjaTotal: number;
  stigliaCount: number;
  timesCalled: number;
  voluntaryCalls: number;
  forcedCalls: number;
  voluntaryOpportunities: number;
  callerSuccesses: number;
  voluntarySuccesses: number;
  forcedSuccesses: number;
  callValueAdded: number;
  callPoints: number[];
  noCallPoints: number[];
  clutchHits: number;
  clutchTotal: number;
  biggestRound: number;
  biggestComeback: number;
  calledSuitCounter: Record<CalledSuit, number>;
  outcomes: number[];
}

interface PairAcc {
  playerAId: string;
  playerBId: string;
  gamesTogether: number;
  winsTogether: number;
  pointsFor: number;
  pointsAgainst: number;
  roundsPlayed: number;
  pointsPerRound: number[];
  zvanjaTotal: number;
  stigliaCount: number;
  timesCalled: number;
  voluntaryCalls: number;
  forcedCalls: number;
  callerSuccesses: number;
  callValueAdded: number;
  clutchHits: number;
  clutchTotal: number;
  calledSuitCounter: Record<CalledSuit, number>;
  outcomes: number[];
  expectedWins: number;
}

interface HeadToHead {
  games: number;
  wins: number;
  expectedWins: number;
}

export interface AllStats {
  players: PlayerStats[];
  pairs: PairStats[];
  rating: RatingResult;
}

function newPlayerAcc(player: Player): PlayerAcc {
  return {
    player,
    roundsPlayed: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    pointsWon: 0,
    pointsAgainst: 0,
    pointsPerRound: [],
    positiveRounds: 0,
    zvanjaTotal: 0,
    stigliaCount: 0,
    timesCalled: 0,
    voluntaryCalls: 0,
    forcedCalls: 0,
    voluntaryOpportunities: 0,
    callerSuccesses: 0,
    voluntarySuccesses: 0,
    forcedSuccesses: 0,
    callValueAdded: 0,
    callPoints: [],
    noCallPoints: [],
    clutchHits: 0,
    clutchTotal: 0,
    biggestRound: 0,
    biggestComeback: 0,
    calledSuitCounter: emptySuitCounter(),
    outcomes: [],
  };
}

function newPairAcc(playerAId: string, playerBId: string): PairAcc {
  return {
    playerAId,
    playerBId,
    gamesTogether: 0,
    winsTogether: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    roundsPlayed: 0,
    pointsPerRound: [],
    zvanjaTotal: 0,
    stigliaCount: 0,
    timesCalled: 0,
    voluntaryCalls: 0,
    forcedCalls: 0,
    callerSuccesses: 0,
    callValueAdded: 0,
    clutchHits: 0,
    clutchTotal: 0,
    calledSuitCounter: emptySuitCounter(),
    outcomes: [],
    expectedWins: 0,
  };
}

/**
 * Jedan prolaz kroz povijest koji gradi i statistiku igrača i statistiku parova.
 * Prije su to bile dvije funkcije od kojih je jedna zvala drugu, pa se sve
 * računalo dvaput.
 */
export function computeAllStats(players: Player[], games: Game[], rounds: Round[]): AllStats {
  const rating = computeRatings(games, rounds);
  const roundsByGame = groupRoundsByGame(rounds);
  const usernameById = new Map(players.map((player) => [player.id, player.username]));
  const ratingOf = (playerId: string) =>
    rating.byPlayer.get(playerId)?.rating ?? rating.config.initialRating;

  // --- 1. Kontekst po rundi + ligaške osnovice za Call Value Added ---
  const scoredGames: ScoredGameContext[] = [];
  let voluntaryNetSum = 0;
  let voluntaryNetCount = 0;
  let forcedNetSum = 0;
  let forcedNetCount = 0;

  for (const scored of rating.scoredGames) {
    const { game } = scored;
    const contexts: RoundContext[] = [];
    let cumulativeA = 0;
    let cumulativeB = 0;

    for (const roundRow of roundsByGame.get(game.id) ?? []) {
      const resolved = resolveRoundPoints(roundRow);
      const dealerPlayerId = getDealerForRound(game, roundRow.roundNumber);
      const forcedCall = roundRow.callerPlayerId === dealerPlayerId;
      contexts.push({
        round: roundRow,
        pointsA: resolved.teamA,
        pointsB: resolved.teamB,
        dealerPlayerId,
        forcedCall,
        clutch:
          Math.max(cumulativeA, cumulativeB) >= CLUTCH_LEAD_THRESHOLD &&
          Math.abs(cumulativeA - cumulativeB) <= CLUTCH_MARGIN_THRESHOLD,
      });

      const callerNet =
        roundRow.callingTeam === "A"
          ? resolved.teamA - resolved.teamB
          : resolved.teamB - resolved.teamA;
      if (forcedCall) {
        forcedNetSum += callerNet;
        forcedNetCount += 1;
      } else {
        voluntaryNetSum += callerNet;
        voluntaryNetCount += 1;
      }

      cumulativeA += resolved.teamA;
      cumulativeB += resolved.teamB;
    }

    const ratingA = (ratingOf(game.teams.teamA[0]) + ratingOf(game.teams.teamA[1])) / 2;
    const ratingB = (ratingOf(game.teams.teamB[0]) + ratingOf(game.teams.teamB[1])) / 2;
    scoredGames.push({
      game,
      winner: scored.winner,
      contexts,
      expectedA: expectedScore(ratingA, ratingB),
    });
  }

  const overallNet =
    (voluntaryNetSum + forcedNetSum) / Math.max(1, voluntaryNetCount + forcedNetCount);
  // Zvanje iz mora ima bitno lošiju očekivanu vrijednost od zvanja iz volje, pa
  // se mjeri protiv vlastite osnovice — inače bi djelitelj bio kažnjen za to
  // što je morao zvati.
  const baselineVoluntary = voluntaryNetCount ? voluntaryNetSum / voluntaryNetCount : overallNet;
  const baselineForced = forcedNetCount ? forcedNetSum / forcedNetCount : overallNet;

  // --- 2. Jedan kronološki prolaz kroz završene partije ---
  const playerAccs = new Map<string, PlayerAcc>(
    players.map((player) => [player.id, newPlayerAcc(player)]),
  );
  const pairAccs = new Map<string, PairAcc>();
  const headToHead = new Map<string, Map<string, HeadToHead>>();

  const pairKeyOf = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

  for (const scored of scoredGames) {
    const { game, contexts, winner, expectedA } = scored;

    for (const teamId of ["A", "B"] as const) {
      const teamIds = teamId === "A" ? game.teams.teamA : game.teams.teamB;
      const expected = teamId === "A" ? expectedA : 1 - expectedA;
      const outcome = winner === null ? 0 : winner === teamId ? 1 : -1;

      // -- par --
      const [pa, pb] = [teamIds[0], teamIds[1]].sort();
      const pairKey = pairKeyOf(pa, pb);
      const pair = pairAccs.get(pairKey) ?? newPairAcc(pa, pb);
      pair.gamesTogether += 1;
      pair.winsTogether += outcome > 0 ? 1 : 0;
      pair.outcomes.push(outcome);
      pair.expectedWins += expected;

      // -- igrači --
      const memberAccs = teamIds
        .map((playerId) => playerAccs.get(playerId))
        .filter((acc): acc is PlayerAcc => Boolean(acc));
      for (const acc of memberAccs) {
        acc.gamesPlayed += 1;
        acc.gamesWon += outcome > 0 ? 1 : 0;
        acc.outcomes.push(outcome);
      }

      // Preokret se traži unutar jedne partije. Prije se prefiks-suma vukla
      // kroz sve partije igrača, pa je "comeback" mogao biti sastavljen od
      // kraja jedne i početka druge partije.
      let runningNet = 0;
      let minPrefix = 0;
      let bestRecovery = 0;

      for (const ctx of contexts) {
        const points = teamId === "A" ? ctx.pointsA : ctx.pointsB;
        const against = teamId === "A" ? ctx.pointsB : ctx.pointsA;
        const net = points - against;
        const zvanjaTeam = teamId === "A" ? ctx.round.zvanjaTeamA : ctx.round.zvanjaTeamB;
        const hasStiglia = ctx.round.stigliaTeam === teamId;
        const callerIsOurs = teamIds.includes(ctx.round.callerPlayerId);
        const cva = callerIsOurs
          ? net - (ctx.forcedCall ? baselineForced : baselineVoluntary)
          : 0;

        runningNet += net;
        bestRecovery = Math.max(bestRecovery, runningNet - minPrefix);
        minPrefix = Math.min(minPrefix, runningNet);

        pair.roundsPlayed += 1;
        pair.pointsFor += points;
        pair.pointsAgainst += against;
        pair.pointsPerRound.push(points);
        pair.zvanjaTotal += zvanjaTeam;
        if (hasStiglia) pair.stigliaCount += 1;
        if (ctx.clutch) {
          pair.clutchTotal += 1;
          if (net > 0) pair.clutchHits += 1;
        }
        if (callerIsOurs) {
          pair.timesCalled += 1;
          if (ctx.forcedCall) pair.forcedCalls += 1;
          else pair.voluntaryCalls += 1;
          if (ctx.round.callerSucceeded) pair.callerSuccesses += 1;
          pair.calledSuitCounter[ctx.round.calledSuit] += 1;
          pair.callValueAdded += cva;
        }

        for (const acc of memberAccs) {
          const playerId = acc.player.id;
          acc.roundsPlayed += 1;
          acc.pointsWon += points;
          acc.pointsAgainst += against;
          acc.pointsPerRound.push(points);
          if (net > 0) acc.positiveRounds += 1;
          acc.zvanjaTotal += zvanjaForPlayer(ctx.round, playerId);
          if (hasStiglia) acc.stigliaCount += 1;
          acc.biggestRound = Math.max(acc.biggestRound, points);
          if (ctx.clutch) {
            acc.clutchTotal += 1;
            if (net > 0) acc.clutchHits += 1;
          }
          if (ctx.dealerPlayerId !== playerId) acc.voluntaryOpportunities += 1;

          if (ctx.round.callerPlayerId === playerId) {
            acc.timesCalled += 1;
            acc.callPoints.push(points);
            acc.calledSuitCounter[ctx.round.calledSuit] += 1;
            acc.callValueAdded += cva;
            if (ctx.round.callerSucceeded) acc.callerSuccesses += 1;
            if (ctx.forcedCall) {
              acc.forcedCalls += 1;
              if (ctx.round.callerSucceeded) acc.forcedSuccesses += 1;
            } else {
              acc.voluntaryCalls += 1;
              if (ctx.round.callerSucceeded) acc.voluntarySuccesses += 1;
            }
          } else {
            acc.noCallPoints.push(points);
          }
        }
      }

      for (const acc of memberAccs) {
        acc.biggestComeback = Math.max(acc.biggestComeback, bestRecovery);
      }
      pairAccs.set(pairKey, pair);
    }

    // -- međusobni omjeri --
    for (const playerId of game.teams.teamA) {
      for (const opponentId of game.teams.teamB) {
        recordHeadToHead(headToHead, playerId, opponentId, winner === "A", expectedA);
        recordHeadToHead(headToHead, opponentId, playerId, winner === "B", 1 - expectedA);
      }
    }
  }

  // --- 3. Parovi: kemija u odnosu na ono što rejtinzi predviđaju ---
  const pairs: PairStats[] = Array.from(pairAccs.values()).map((acc) => {
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

  const pairsByPlayer = new Map<string, PairStats[]>();
  for (const pair of pairs) {
    for (const playerId of [pair.playerAId, pair.playerBId]) {
      const bucket = pairsByPlayer.get(playerId) ?? [];
      bucket.push(pair);
      pairsByPlayer.set(playerId, bucket);
    }
  }

  // --- 4. Igrači ---
  const playerRows: PlayerStats[] = Array.from(playerAccs.values()).map((acc) => {
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

  playerRows.sort(
    (a, b) =>
      Number(b.gamesPlayed > 0) - Number(a.gamesPlayed > 0) ||
      b.conservativeRating - a.conservativeRating ||
      b.rating - a.rating,
  );
  pairs.sort(
    (a, b) => b.chemistry - a.chemistry || b.gamesTogether - a.gamesTogether,
  );

  return { players: playerRows, pairs, rating };
}

function recordHeadToHead(
  table: Map<string, Map<string, HeadToHead>>,
  playerId: string,
  opponentId: string,
  won: boolean,
  expected: number,
) {
  const row = table.get(playerId) ?? new Map<string, HeadToHead>();
  const record = row.get(opponentId) ?? { games: 0, wins: 0, expectedWins: 0 };
  record.games += 1;
  record.wins += won ? 1 : 0;
  record.expectedWins += expected;
  row.set(opponentId, record);
  table.set(playerId, row);
}

export function computePlayerStats(players: Player[], games: Game[], rounds: Round[]): PlayerStats[] {
  return computeAllStats(players, games, rounds).players;
}

export function computePairStats(players: Player[], games: Game[], rounds: Round[]): PairStats[] {
  return computeAllStats(players, games, rounds).pairs;
}
