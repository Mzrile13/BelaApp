import type { CalledSuit, Game, PairStats, Player, PlayerStats, Round, TeamId } from "@/lib/types";
import { resolveRoundPoints } from "./scoring";

const MVP_MIN_GAMES = 10;
const MVP_MIN_ROUNDS = 60;

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
  const variance = avg(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function normalize(values: number[], value: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return 0.5;
  return (value - min) / (max - min);
}

function smoothRate(successes: number, attempts: number, prior = 0.5, weight = 8) {
  return (successes + prior * weight) / (attempts + weight);
}

function calcTrend(last5: number, last10: number): "hot" | "steady" | "cold" {
  if (last5 - last10 > 8) return "hot";
  if (last10 - last5 > 8) return "cold";
  return "steady";
}

function getPlayerTeam(game: Game, playerId: string): TeamId {
  return game.teams.teamA.includes(playerId) ? "A" : "B";
}

function getTeamPoints(round: Round, team: TeamId) {
  const resolved = resolveRoundPoints(round);
  return team === "A" ? resolved.teamA : resolved.teamB;
}

function getOppPoints(round: Round, team: TeamId) {
  const resolved = resolveRoundPoints(round);
  return team === "A" ? resolved.teamB : resolved.teamA;
}

function biggestComeback(roundNets: number[]) {
  let minPrefix = 0;
  let prefix = 0;
  let maxRecovery = 0;
  for (const net of roundNets) {
    prefix += net;
    maxRecovery = Math.max(maxRecovery, prefix - minPrefix);
    minPrefix = Math.min(minPrefix, prefix);
  }
  return maxRecovery;
}

export function computePairStats(players: Player[], games: Game[], rounds: Round[]): PairStats[] {
  const usernameById = new Map(players.map((player) => [player.id, player.username]));
  const rows: PairStats[] = [];

  for (const game of games) {
    // Do not count wins/losses for an ongoing game.
    if (!game.finishedAt) continue;
    const score = rounds
      .filter((round) => round.gameId === game.id)
      .reduce(
        (acc, round) => {
          const resolved = resolveRoundPoints(round);
          acc.a += resolved.teamA;
          acc.b += resolved.teamB;
          return acc;
        },
        { a: 0, b: 0 },
      );
    const winner = score.a >= score.b ? "A" : "B";
    const pairs: Array<[string, string, TeamId]> = [
      [game.teams.teamA[0], game.teams.teamA[1], "A"],
      [game.teams.teamB[0], game.teams.teamB[1], "B"],
    ];

    for (const [a, b, team] of pairs) {
      const sorted = [a, b].sort();
      const key = `${sorted[0]}:${sorted[1]}`;
      const current = rows.find((row) => `${row.playerAId}:${row.playerBId}` === key);
      const won = team === winner;

      if (!current) {
        rows.push({
          playerAId: sorted[0],
          playerBId: sorted[1],
          playerAUsername: usernameById.get(sorted[0]) ?? "Unknown",
          playerBUsername: usernameById.get(sorted[1]) ?? "Unknown",
          gamesTogether: 1,
          winsTogether: won ? 1 : 0,
          winRate: won ? 1 : 0,
        });
      } else {
        current.gamesTogether += 1;
        current.winsTogether += won ? 1 : 0;
        current.winRate = current.winsTogether / current.gamesTogether;
      }
    }
  }

  return rows.sort((a, b) => b.winRate - a.winRate || b.gamesTogether - a.gamesTogether);
}

export function computePlayerStats(players: Player[], games: Game[], rounds: Round[]): PlayerStats[] {
  const rows = players.map((player) => {
    const playerGames = games.filter(
      (game) =>
        game.teams.teamA.includes(player.id) || game.teams.teamB.includes(player.id),
    );
    const finishedPlayerGames = playerGames.filter((game) => game.finishedAt !== null);
    const gameIds = new Set(finishedPlayerGames.map((game) => game.id));
    const playerRounds = rounds
      .filter((round) => gameIds.has(round.gameId))
      .sort((a, b) => a.roundNumber - b.roundNumber);

    const pointsPerRound: number[] = [];
    const netPerRound: number[] = [];
    const callPoints: number[] = [];
    const noCallPoints: number[] = [];
    let roundsPlayed = 0;
    let pointsWon = 0;
    let pointsAgainst = 0;
    let zvanjaTotal = 0;
    let stigliaCount = 0;
    let timesCalled = 0;
    let callerSuccesses = 0;
    let biggestRound = 0;
    let clutchHits = 0;
    let clutchTotal = 0;
    const calledSuitCounter: Record<CalledSuit, number> = {
      karo: 0,
      herc: 0,
      pik: 0,
      tref: 0,
    };

    for (const round of playerRounds) {
      const game = finishedPlayerGames.find((candidate) => candidate.id === round.gameId);
      if (!game) continue;
      roundsPlayed += 1;
      const team = getPlayerTeam(game, player.id);
      const points = getTeamPoints(round, team);
      const against = getOppPoints(round, team);
      const zvanjaByPlayerA = round.zvanjaByPlayerA ?? [];
      const zvanjaByPlayerB = round.zvanjaByPlayerB ?? [];
      const zvanjaFromArrays =
        zvanjaByPlayerA
          .filter((entry) => entry.playerId === player.id)
          .reduce((sum, entry) => sum + entry.points, 0) +
        zvanjaByPlayerB
          .filter((entry) => entry.playerId === player.id)
          .reduce((sum, entry) => sum + entry.points, 0);
      const zvanjaFromLegacy =
        (round.zvanjaPlayerIdA === player.id ? round.zvanjaTeamA : 0) +
        (round.zvanjaPlayerIdB === player.id ? round.zvanjaTeamB : 0);
      const zvanja = zvanjaByPlayerA.length || zvanjaByPlayerB.length ? zvanjaFromArrays : zvanjaFromLegacy;
      const net = points - against;
      const hasStiglia = round.stigliaTeam === team;

      pointsWon += points;
      pointsAgainst += against;
      zvanjaTotal += zvanja;
      if (hasStiglia) stigliaCount += 1;
      pointsPerRound.push(points);
      netPerRound.push(net);
      biggestRound = Math.max(biggestRound, points);

      if (round.callerPlayerId === player.id) {
        timesCalled += 1;
        callPoints.push(points);
        if (round.callerSucceeded) callerSuccesses += 1;
        calledSuitCounter[round.calledSuit] += 1;
      } else {
        noCallPoints.push(points);
      }

      if (Math.abs(net) <= 10) {
        clutchTotal += 1;
        if (net > 0) clutchHits += 1;
      }
    }

    let gamesWon = 0;
    for (const game of playerGames) {
      const gameRounds = rounds.filter((round) => round.gameId === game.id);
      const score = gameRounds.reduce(
        (acc, round) => {
          const resolved = resolveRoundPoints(round);
          acc.a += resolved.teamA;
          acc.b += resolved.teamB;
          return acc;
        },
        { a: 0, b: 0 },
      );
      // Ongoing games should not be counted as won/lost yet.
      if (!game.finishedAt) continue;
      const team = getPlayerTeam(game, player.id);
      const won = team === "A" ? score.a >= score.b : score.b >= score.a;
      if (won) gamesWon += 1;
    }

    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let bestWinStreak = 0;
    let worstLossStreak = 0;
    for (const net of netPerRound) {
      if (net > 0) {
        currentWinStreak += 1;
        currentLossStreak = 0;
      } else if (net < 0) {
        currentLossStreak += 1;
        currentWinStreak = 0;
      } else {
        currentWinStreak = 0;
        currentLossStreak = 0;
      }
      bestWinStreak = Math.max(bestWinStreak, currentWinStreak);
      worstLossStreak = Math.max(worstLossStreak, currentLossStreak);
    }

    const avgPoints = avg(pointsPerRound);
    const avgZvanja = roundsPlayed ? zvanjaTotal / roundsPlayed : 0;
    const callsPerRoundAvg = roundsPlayed ? timesCalled / roundsPlayed : 0;
    const favoriteCalledSuit = (Object.entries(calledSuitCounter) as Array<[CalledSuit, number]>)
      .sort((a, b) => b[1] - a[1])[0];
    const avgLast5 = avg(pointsPerRound.slice(-5));
    const avgLast10 = avg(pointsPerRound.slice(-10));
    const consistency = stdDev(pointsPerRound);
    const callerSuccessRate = smoothRate(callerSuccesses, timesCalled);
    const callerRiskScore = timesCalled
      ? round((timesCalled / Math.max(1, roundsPlayed)) * (1 - callerSuccessRate), 3)
      : 0;

    return {
      playerId: player.id,
      username: player.username,
      roundsPlayed,
      gamesPlayed: finishedPlayerGames.length,
      gamesWon,
      pointsWon,
      pointsAgainst,
      avgPoints: round(avgPoints),
      zvanjaTotal,
      stigliaCount,
      avgZvanja: round(avgZvanja),
      timesCalled,
      callsPerRoundAvg: round(callsPerRoundAvg, 3),
      favoriteCalledSuit: favoriteCalledSuit && favoriteCalledSuit[1] > 0 ? favoriteCalledSuit[0] : null,
      callerSuccessRate: round(callerSuccessRate),
      avgPointsWhenCalling: round(avg(callPoints)),
      avgPointsWhenNotCalling: round(avg(noCallPoints)),
      netPerRound: round(pointsWon - pointsAgainst ? (pointsWon - pointsAgainst) / Math.max(1, roundsPlayed) : 0),
      positiveRoundRate: round(netPerRound.filter((n) => n > 0).length / Math.max(1, roundsPlayed)),
      consistencyIndex: round(consistency),
      bestWinStreak,
      worstLossStreak,
      trend: calcTrend(avgLast5, avgLast10),
      avgLast5: round(avgLast5),
      avgLast10: round(avgLast10),
      biggestRound,
      biggestComeback: round(biggestComeback(netPerRound)),
      clutchIndex: round(clutchTotal ? clutchHits / clutchTotal : 0),
      partnerImpact: 0,
      callerRiskScore,
      mvpScore: 0,
      insufficientSample:
        finishedPlayerGames.length < MVP_MIN_GAMES || roundsPlayed < MVP_MIN_ROUNDS,
    };
  });

  const pairStats = computePairStats(players, games, rounds);
  const pairMap = new Map<string, PairStats[]>();
  for (const pair of pairStats) {
    if (!pairMap.has(pair.playerAId)) pairMap.set(pair.playerAId, []);
    if (!pairMap.has(pair.playerBId)) pairMap.set(pair.playerBId, []);
    pairMap.get(pair.playerAId)?.push(pair);
    pairMap.get(pair.playerBId)?.push(pair);
  }

  for (const row of rows) {
    const pairs = pairMap.get(row.playerId) ?? [];
    row.partnerImpact = round(
      pairs.length ? avg(pairs.map((pair) => pair.winRate)) - row.gamesWon / Math.max(1, row.gamesPlayed) : 0,
    );
  }

  const avgPointsValues = rows.map((row) => row.avgPoints);
  const callSuccessValues = rows.map((row) => row.callerSuccessRate);
  const winRateValues = rows.map((row) => row.gamesWon / Math.max(1, row.gamesPlayed));
  const consistencyValues = rows.map((row) => 1 / (1 + row.consistencyIndex));
  const partnerValues = rows.map((row) => row.partnerImpact);
  const clutchValues = rows.map((row) => row.clutchIndex);

  for (const row of rows) {
    const mvpScore =
      normalize(avgPointsValues, row.avgPoints) * 0.35 +
      normalize(callSuccessValues, row.callerSuccessRate) * 0.2 +
      normalize(winRateValues, row.gamesWon / Math.max(1, row.gamesPlayed)) * 0.15 +
      normalize(consistencyValues, 1 / (1 + row.consistencyIndex)) * 0.15 +
      normalize(partnerValues, row.partnerImpact) * 0.1 +
      normalize(clutchValues, row.clutchIndex) * 0.05;

    row.mvpScore = round(mvpScore * 100);
  }

  return rows.sort((a, b) => b.mvpScore - a.mvpScore || b.avgPoints - a.avgPoints);
}
