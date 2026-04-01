export type TeamId = "A" | "B";
export type CalledSuit = "karo" | "herc" | "pik" | "tref";
export interface PlayerZvanja {
  playerId: string;
  points: number;
}

export interface Player {
  id: string;
  username: string;
  createdAt: string;
}

export interface GameTeam {
  teamA: [string, string];
  teamB: [string, string];
}

export interface Game {
  id: string;
  dealerPlayerId: string;
  createdAt: string;
  finishedAt: string | null;
  teams: GameTeam;
}

export interface Round {
  id: string;
  gameId: string;
  roundNumber: number;
  callerPlayerId: string;
  calledSuit: CalledSuit;
  calledSuitLegacyMissing?: boolean;
  callingTeam: TeamId;
  pointsTeamA: number;
  pointsTeamB: number;
  zvanjaTeamA: number;
  zvanjaTeamB: number;
  zvanjaPlayerIdA: string | null;
  zvanjaPlayerIdB: string | null;
  zvanjaByPlayerA?: PlayerZvanja[];
  zvanjaByPlayerB?: PlayerZvanja[];
  stigliaTeam: TeamId | null;
  callerSucceeded: boolean;
  createdAt: string;
}

export interface RoundInput {
  gameId: string;
  callerPlayerId: string;
  calledSuit: CalledSuit;
  pointsTeamA: number;
  pointsTeamB: number;
  zvanjaTeamA: number;
  zvanjaTeamB: number;
  zvanjaPlayerIdA: string | null;
  zvanjaPlayerIdB: string | null;
  zvanjaByPlayerA?: PlayerZvanja[];
  zvanjaByPlayerB?: PlayerZvanja[];
  stigliaTeam: TeamId | null;
}

export interface NewGameInput {
  dealerPlayerId: string;
  teamA: [string, string];
  teamB: [string, string];
}

export interface PlayerStats {
  playerId: string;
  username: string;
  roundsPlayed: number;
  gamesPlayed: number;
  gamesWon: number;
  pointsWon: number;
  pointsAgainst: number;
  avgPoints: number;
  zvanjaTotal: number;
  stigliaCount: number;
  avgZvanja: number;
  timesCalled: number;
  callsPerRoundAvg: number;
  favoriteCalledSuit: CalledSuit | null;
  callerSuccessRate: number;
  avgPointsWhenCalling: number;
  avgPointsWhenNotCalling: number;
  netPerRound: number;
  positiveRoundRate: number;
  consistencyIndex: number;
  currentStreak: number;
  bestWinStreak: number;
  worstLossStreak: number;
  trend: "hot" | "steady" | "cold";
  avgLast5: number;
  avgLast10: number;
  biggestRound: number;
  biggestComeback: number;
  clutchIndex: number;
  partnerImpact: number;
  callerRiskScore: number;
  last5GameResults: Array<"W" | "L" | "D">;
  mvpScore: number;
  insufficientSample: boolean;
}

export interface PairStats {
  playerAId: string;
  playerBId: string;
  playerAUsername: string;
  playerBUsername: string;
  gamesTogether: number;
  winsTogether: number;
  winRate: number;
}
