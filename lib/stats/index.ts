import { getDealerForRound } from "@/lib/dealer";
import { computeRatings, expectedScore } from "@/lib/rating";
import { groupRoundsByGame, resolveRoundPoints } from "@/lib/scoring";
import type { Game, PairStats, Player, PlayerStats, Round } from "@/lib/types";
import { newPairAcc, newPlayerAcc, recordHeadToHead } from "./accumulators";
import { CLUTCH_LEAD_THRESHOLD, CLUTCH_MARGIN_THRESHOLD } from "./constants";
import { buildPairRows } from "./pairs";
import { buildPlayerRows } from "./players";
import type { AllStats, HeadToHead, PairAcc, PlayerAcc, RoundContext, ScoredGameContext } from "./types";
import { zvanjaForPlayer } from "./zvanja";

export type { AllStats } from "./types";

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
  // Zvanje na mus ima bitno lošiju očekivanu vrijednost od zvanja iz volje, pa
  // se mjeri protiv vlastite osnovice — inače bi djelitelj bio kažnjen za to
  // što je bio na musu.
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

  const ctx = { rating, ratingOf, usernameById };
  // --- 3. Parovi, 4. Igrači ---
  const pairs = buildPairRows(pairAccs.values(), ctx);
  const playerRows = buildPlayerRows(playerAccs.values(), pairs, headToHead, ctx);

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

export function computePlayerStats(players: Player[], games: Game[], rounds: Round[]): PlayerStats[] {
  return computeAllStats(players, games, rounds).players;
}

export function computePairStats(players: Player[], games: Game[], rounds: Round[]): PairStats[] {
  return computeAllStats(players, games, rounds).pairs;
}
