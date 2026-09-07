import type { Game, Player, Round, TeamId } from "../lib/types";

export function mkPlayer(name: string, index: number): Player {
  return {
    id: `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`,
    username: name,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

export function mkGame(options: {
  id: string;
  teamA: [string, string];
  teamB: [string, string];
  createdAt: string;
  dealerPlayerId?: string;
  finishedAt?: string | null;
}): Game {
  return {
    id: options.id,
    dealerPlayerId: options.dealerPlayerId ?? options.teamA[0],
    createdAt: options.createdAt,
    finishedAt: options.finishedAt === undefined ? options.createdAt : options.finishedAt,
    teams: { teamA: options.teamA, teamB: options.teamB },
  };
}

export function mkRound(options: {
  gameId: string;
  roundNumber: number;
  callerPlayerId: string;
  callingTeam: TeamId;
  pointsTeamA: number;
  pointsTeamB: number;
  callerSucceeded?: boolean;
  zvanjaTeamA?: number;
  zvanjaTeamB?: number;
  zvanjaPlayerIdA?: string | null;
  zvanjaPlayerIdB?: string | null;
  stigliaTeam?: TeamId | null;
}): Round {
  return {
    id: `${options.gameId}-r${options.roundNumber}`,
    gameId: options.gameId,
    roundNumber: options.roundNumber,
    callerPlayerId: options.callerPlayerId,
    calledSuit: "herc",
    callingTeam: options.callingTeam,
    pointsTeamA: options.pointsTeamA,
    pointsTeamB: options.pointsTeamB,
    zvanjaTeamA: options.zvanjaTeamA ?? 0,
    zvanjaTeamB: options.zvanjaTeamB ?? 0,
    zvanjaPlayerIdA: options.zvanjaPlayerIdA ?? null,
    zvanjaPlayerIdB: options.zvanjaPlayerIdB ?? null,
    stigliaTeam: options.stigliaTeam ?? null,
    callerSucceeded: options.callerSucceeded ?? true,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

/**
 * Završena partija sažeta u jednu rundu s traženim konačnim rezultatom.
 * Rejting gleda samo konačni rezultat, pa je za njegove testove ovo dovoljno.
 */
export function mkFinishedGame(
  id: string,
  teamA: [string, string],
  teamB: [string, string],
  scoreA: number,
  scoreB: number,
  createdAt: string,
): { game: Game; rounds: Round[] } {
  const game = mkGame({ id, teamA, teamB, createdAt });
  return {
    game,
    rounds: [
      mkRound({
        gameId: id,
        roundNumber: 1,
        callerPlayerId: teamA[0],
        callingTeam: "A",
        pointsTeamA: scoreA,
        pointsTeamB: scoreB,
      }),
    ],
  };
}

/** Niz istovjetnih partija s rastućim datumima. */
export function repeatGames(
  count: number,
  build: (index: number) => {
    teamA: [string, string];
    teamB: [string, string];
    scoreA: number;
    scoreB: number;
  },
  startIndex = 0,
) {
  const games: Game[] = [];
  const rounds: Round[] = [];
  for (let i = 0; i < count; i += 1) {
    const spec = build(i);
    const index = startIndex + i;
    const day = String((index % 27) + 1).padStart(2, "0");
    const month = String((Math.floor(index / 27) % 12) + 1).padStart(2, "0");
    const created = `2026-${month}-${day}T${String(index % 24).padStart(2, "0")}:00:00.000Z`;
    const built = mkFinishedGame(
      `game-${String(index).padStart(4, "0")}`,
      spec.teamA,
      spec.teamB,
      spec.scoreA,
      spec.scoreB,
      created,
    );
    games.push(built.game);
    rounds.push(...built.rounds);
  }
  return { games, rounds };
}
