import type { RatingData } from "@/lib/ratingHistory";
import type { Player, Round, TeamId } from "@/lib/types";

/** Ispod ovoga igrač ne može biti MVP sezone (vidi i /leaderboard/categories). */
export const MVP_MIN_GAMES = 5;
/** Ispod ovoga par ne može biti prvak sezone. */
export const PAIR_CHAMPION_MIN_GAMES = 3;

/** "25/26" <-> "25-26": kosa crta ne ide u URL segment. */
export function seasonSlug(season: string) {
  return season.replace("/", "-");
}

export function seasonFromSlug(slug: string) {
  return /^\d{2}-\d{2}$/.test(slug) ? slug.replace("-", "/") : null;
}

export interface SeasonPlayerRow {
  playerId: string;
  username: string;
  games: number;
  wins: number;
  winRate: number;
  /** Zbroj promjena rejtinga u sezoni (bez povlačenja prema prosjeku na početku). */
  delta: number;
  ratingEnd: number;
}

export interface SeasonPairRow {
  playerAId: string;
  playerBId: string;
  playerAUsername: string;
  playerBUsername: string;
  games: number;
  wins: number;
  winRate: number;
}

export interface SeasonSummary {
  season: string;
  games: number;
  rounds: number;
  stigliaCount: number;
  /** Igrači sortirani po napretku u sezoni. */
  players: SeasonPlayerRow[];
  mvp: SeasonPlayerRow | null;
  pairs: SeasonPairRow[];
  pairChampion: SeasonPairRow | null;
  biggestWin: {
    gameId: string;
    margin: number;
    winner: TeamId;
    winnerIds: [string, string];
    scoreA: number;
    scoreB: number;
    createdAt: string;
  } | null;
}

export function computeSeasonSummary(
  season: string,
  data: RatingData,
  players: Player[],
  rounds: Round[],
): SeasonSummary {
  const usernameById = new Map(players.map((player) => [player.id, player.username]));
  const seasonGames = data.scoredGames.filter((scored) => scored.season === season);
  const seasonGameIds = new Set(seasonGames.map((scored) => scored.game.id));
  const seasonRounds = rounds.filter((round) => seasonGameIds.has(round.gameId));

  const playerRows: SeasonPlayerRow[] = [];
  for (const [playerId, history] of Object.entries(data.historyByPlayer)) {
    const entries = history.filter((entry) => entry.season === season);
    if (!entries.length) continue;
    const wins = entries.filter((entry) => entry.won).length;
    playerRows.push({
      playerId,
      username: usernameById.get(playerId) ?? "Unknown",
      games: entries.length,
      wins,
      winRate: wins / entries.length,
      delta: entries.reduce((sum, entry) => sum + entry.delta, 0),
      ratingEnd: entries[entries.length - 1].ratingAfter,
    });
  }
  playerRows.sort((a, b) => b.delta - a.delta || b.games - a.games);
  const mvp = playerRows.find((row) => row.games >= MVP_MIN_GAMES) ?? null;

  const pairMap = new Map<string, SeasonPairRow>();
  let biggestWin: SeasonSummary["biggestWin"] = null;
  for (const scored of seasonGames) {
    for (const teamId of ["A", "B"] as const) {
      const ids = [...(teamId === "A" ? scored.game.teams.teamA : scored.game.teams.teamB)].sort();
      const key = ids.join(":");
      const row = pairMap.get(key) ?? {
        playerAId: ids[0],
        playerBId: ids[1],
        playerAUsername: usernameById.get(ids[0]) ?? "Unknown",
        playerBUsername: usernameById.get(ids[1]) ?? "Unknown",
        games: 0,
        wins: 0,
        winRate: 0,
      };
      row.games += 1;
      if (scored.winner === teamId) row.wins += 1;
      row.winRate = row.wins / row.games;
      pairMap.set(key, row);
    }
    if (scored.winner) {
      const margin = Math.abs(scored.scoreA - scored.scoreB);
      if (!biggestWin || margin > biggestWin.margin) {
        biggestWin = {
          gameId: scored.game.id,
          margin,
          winner: scored.winner,
          winnerIds: scored.winner === "A" ? scored.game.teams.teamA : scored.game.teams.teamB,
          scoreA: scored.scoreA,
          scoreB: scored.scoreB,
          createdAt: scored.game.createdAt,
        };
      }
    }
  }
  const pairs = Array.from(pairMap.values()).sort(
    (a, b) => b.winRate - a.winRate || b.games - a.games,
  );
  const pairChampion = pairs.find((row) => row.games >= PAIR_CHAMPION_MIN_GAMES) ?? null;

  return {
    season,
    games: seasonGames.length,
    rounds: seasonRounds.length,
    stigliaCount: seasonRounds.filter((round) => round.stigliaTeam !== null).length,
    players: playerRows,
    mvp,
    pairs,
    pairChampion,
    biggestWin,
  };
}
