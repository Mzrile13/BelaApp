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

export interface PlayerGroup {
  id: string;
  name: string;
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
  groupId: string;
  dealerPlayerId: string;
  teamA: [string, string];
  teamB: [string, string];
}

export interface PlayerStats {
  playerId: string;
  username: string;

  // --- Rejting: jedini broj po kojem se rangira ---
  /** Ekipni Elo, korigiran na partnera i protivnika. Vidi lib/rating.ts. */
  rating: number;
  /** `rating − sigma`. Ljestvica se sortira po ovome. */
  conservativeRating: number;
  sigma: number;
  /** 0–1, raste s brojem odigranih partija. */
  confidence: number;
  /** Premalo partija da bi rejting bio ozbiljan — samo UI oznaka, ne skriva igrača. */
  provisional: boolean;
  peakRating: number;
  /** Promjena rejtinga kroz zadnjih 10 partija. */
  formDelta: number;
  /** Promjena rejtinga u tekućoj sezoni — osnova za "MVP sezone". */
  seasonDelta: number;
  /** Zadnjih do 20 vrijednosti rejtinga, za sparkline. */
  ratingTrail: number[];

  // --- Osnovno ---
  roundsPlayed: number;
  gamesPlayed: number;
  gamesWon: number;
  pointsWon: number;
  pointsAgainst: number;
  avgPoints: number;
  zvanjaTotal: number;
  stigliaCount: number;
  avgZvanja: number;

  // --- Zvanje aduta ---
  timesCalled: number;
  callsPerRoundAvg: number;
  /** Zvanja iz volje (igrač nije bio djelitelj te runde). */
  voluntaryCalls: number;
  /** Zvanja "iz mora" — djelitelj mora zvati ako svi prije njega dalju. */
  forcedCalls: number;
  /** Udio ruku u kojima je igrač zvao iako nije morao. */
  voluntaryCallRate: number;
  callerSuccessRate: number;
  voluntaryCallerSuccessRate: number;
  forcedCallerSuccessRate: number;
  /**
   * Call Value Added po partiji: koliko je bodova razlike igračevo zvanje
   * donijelo iznad ligaškog prosjeka za istu vrstu zvanja (iz volje / iz mora).
   * Zamjena za prolaznost, koja je nagrađivala pasivnost.
   */
  callValueAdded: number;
  callValueAddedPerCall: number;
  favoriteCalledSuit: CalledSuit | null;
  avgPointsWhenCalling: number;
  avgPointsWhenNotCalling: number;

  // --- Kvaliteta ruku ---
  netPerRound: number;
  positiveRoundRate: number;
  consistencyIndex: number;
  biggestRound: number;
  /** Najveći preokret unutar jedne partije (više ne prelazi granice partija). */
  biggestComeback: number;
  /** Udio dobivenih ruku u završnici partije (vodeći ≥ 700, razlika ≤ 150). */
  clutchIndex: number;
  clutchRounds: number;

  // --- Forma i nizovi ---
  currentStreak: number;
  bestWinStreak: number;
  worstLossStreak: number;
  trend: "hot" | "steady" | "cold";
  avgLast5: number;
  avgLast10: number;
  last5GameResults: Array<"W" | "L" | "D">;
  last10GameResults: Array<"W" | "L" | "D">;

  // --- Odnosi ---
  bestPartnerUsername: string | null;
  bestPartnerChemistry: number;
  nemesisUsername: string | null;
  nemesisDelta: number;
  favouriteOpponentUsername: string | null;
  favouriteOpponentDelta: number;
}

export interface PairStats {
  playerAId: string;
  playerBId: string;
  playerAUsername: string;
  playerBUsername: string;

  // --- Kemija: ono po čemu se parovi rangiraju ---
  /** Prosjek pojedinačnih rejtinga para. */
  combinedRating: number;
  /** Postotak pobjeda koji bi se očekivao od ta dva rejtinga protiv stvarnih protivnika. */
  expectedWinRate: number;
  /** `winRate − expectedWinRate`, stisnuto prema 0 po broju zajedničkih partija. */
  chemistry: number;
  chemistryRaw: number;
  confidence: number;
  provisional: boolean;

  gamesTogether: number;
  winsTogether: number;
  winRate: number;
  roundsPlayed: number;
  avgPoints: number;
  avgPlusMinusPerGame: number;
  avgZvanja: number;
  stigliaCount: number;
  timesCalled: number;
  voluntaryCalls: number;
  forcedCalls: number;
  favoriteCalledSuit: CalledSuit | null;
  callerSuccessRate: number;
  callValueAdded: number;
  clutchIndex: number;
  clutchRounds: number;
  trend: "hot" | "steady" | "cold";
  callsPerRoundAvg: number;
  currentStreak: number;
  bestWinStreak: number;
  worstLossStreak: number;
  last5GameResults: Array<"W" | "L" | "D">;
  last10GameResults: Array<"W" | "L" | "D">;
}
