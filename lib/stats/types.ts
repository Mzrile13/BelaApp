import type { RatingResult } from "@/lib/rating";
import type { CalledSuit, Game, PairStats, Player, PlayerStats, Round, TeamId } from "@/lib/types";

/**
 * Runda s izvedenim kontekstom koji jedna runda sama o sebi ne zna: tko je te
 * ruke dijelio (a time i tko je zvao na mus) i je li se igralo u završnici.
 */
export interface RoundContext {
  round: Round;
  pointsA: number;
  pointsB: number;
  /** Djelitelj te ruke; rotira unutar partije, vidi lib/dealer.ts. */
  dealerPlayerId: string;
  /** Zvao je djelitelj, tj. bio je na musu — zvanje nije bilo izbor. */
  forcedCall: boolean;
  /** Rezultat PRIJE ove ruke je bio u završnici. */
  clutch: boolean;
}

export interface ScoredGameContext {
  game: Game;
  winner: TeamId | null;
  contexts: RoundContext[];
  expectedA: number;
}

export interface PlayerAcc {
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

export interface PairAcc {
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

export interface HeadToHead {
  games: number;
  wins: number;
  expectedWins: number;
}

export interface AllStats {
  players: PlayerStats[];
  pairs: PairStats[];
  rating: RatingResult;
}
