import type { Player } from "@/lib/types";
import type { HeadToHead, PairAcc, PlayerAcc } from "./types";
import { emptySuitCounter } from "./zvanja";

export function newPlayerAcc(player: Player): PlayerAcc {
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

export function newPairAcc(playerAId: string, playerBId: string): PairAcc {
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

export function recordHeadToHead(
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
