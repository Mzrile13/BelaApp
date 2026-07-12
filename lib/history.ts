import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { getRepo } from "@/lib/supabase";
import type { Round } from "@/lib/types";

export interface HistoryRow {
  id: string;
  createdAt: string;
  teamA: string[];
  teamB: string[];
  scoreA: number;
  scoreB: number;
  winnerTeam: "A" | "B" | null;
}

export interface HistoryPageResult {
  rows: HistoryRow[];
  hasMore: boolean;
  nextOffset: number;
}

export const HISTORY_PAGE_SIZE = 20;

/**
 * Loads one page of finished games (most recent first) together with their
 * scores. Only the rounds of the games on this page are fetched, so the cost
 * stays flat as the total number of games grows.
 */
export async function getHistoryPage(offset: number, limit: number): Promise<HistoryPageResult> {
  const repo = getRepo();
  const [{ games, hasMore }, players] = await Promise.all([
    repo.listFinishedGamesPage(limit, offset),
    repo.listPlayers(),
  ]);

  const rounds = games.length
    ? await repo.listRoundsForGames(games.map((game) => game.id))
    : [];
  const roundsByGameId = new Map<string, Round[]>();
  for (const round of rounds) {
    const bucket = roundsByGameId.get(round.gameId) ?? [];
    bucket.push(round);
    roundsByGameId.set(round.gameId, bucket);
  }
  const usernameById = new Map(players.map((player) => [player.id, player.username]));

  const rows: HistoryRow[] = [];
  for (const game of games) {
    const gameRounds = roundsByGameId.get(game.id) ?? [];
    if (gameRounds.length === 0) continue;
    const score = getGameScore(gameRounds);
    // Guard against any game marked finished without actually reaching target.
    if (game.finishedAt === null && getWinningTeam(score) === null) continue;
    const winnerTeam =
      score.teamA === score.teamB ? null : score.teamA > score.teamB ? "A" : "B";
    rows.push({
      id: game.id,
      createdAt: game.createdAt,
      teamA: game.teams.teamA.map((id) => usernameById.get(id) ?? "Unknown"),
      teamB: game.teams.teamB.map((id) => usernameById.get(id) ?? "Unknown"),
      scoreA: score.teamA,
      scoreB: score.teamB,
      winnerTeam,
    });
  }

  return { rows, hasMore, nextOffset: offset + limit };
}
