import { getCachedDataset } from "@/lib/cachedStats";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { getRepo } from "@/lib/supabase";
import type { Game, Round } from "@/lib/types";

export interface HistoryRow {
  id: string;
  createdAt: string;
  teamA: string[];
  teamB: string[];
  scoreA: number;
  scoreB: number;
  winnerTeam: "A" | "B" | null;
  comment: string | null;
}

export interface HistoryPageResult {
  rows: HistoryRow[];
  hasMore: boolean;
  nextOffset: number;
}

export interface HistoryFilters {
  /** Datumi u obliku yyyy-mm-dd (vremenska zona Europe/Zagreb), uključivo. */
  from?: string;
  to?: string;
  /** Pobjeda/poraz iz perspektive para, a ako para nema, igrača. */
  result?: "win" | "loss";
  playerId?: string;
  /** Sortirani ključ para `idA:idB` — isti oblik kao u statistici parova. */
  pair?: string;
  /** Pretraga po komentaru (bez razlikovanja velikih/malih slova). */
  q?: string;
}

export interface HistoryFilterOptions {
  players: Array<{ id: string; username: string }>;
  pairs: Array<{ key: string; label: string }>;
}

export const HISTORY_PAGE_SIZE = 20;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function pairKeyOf(a: string, b: string) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/** Sve što dođe iz URL-a se validira; neispravna vrijednost se tiho odbaci. */
export function parseHistoryFilters(params: URLSearchParams): HistoryFilters {
  const filters: HistoryFilters = {};
  const from = params.get("from");
  const to = params.get("to");
  if (from && DATE_RE.test(from)) filters.from = from;
  if (to && DATE_RE.test(to)) filters.to = to;
  const result = params.get("result");
  if (result === "win" || result === "loss") filters.result = result;
  const playerId = params.get("playerId");
  if (playerId && UUID_RE.test(playerId)) filters.playerId = playerId;
  const pair = params.get("pair");
  if (pair) {
    const [a, b, ...rest] = pair.split(":");
    if (a && b && rest.length === 0 && UUID_RE.test(a) && UUID_RE.test(b)) {
      filters.pair = pairKeyOf(a, b);
    }
  }
  const q = params.get("q")?.trim().slice(0, 100);
  if (q) filters.q = q;
  return filters;
}

export function hasActiveFilters(filters: HistoryFilters) {
  return Object.values(filters).some(Boolean);
}

function zagrebDay(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Zagreb" });
}

/** Komentar je zaseban stupac; ako migracija još nije primijenjena, povijest radi bez njega. */
async function loadComments(
  repo: ReturnType<typeof getRepo>,
  gameIds?: string[],
): Promise<Record<string, string>> {
  try {
    return await repo.listGameComments(gameIds);
  } catch {
    return {};
  }
}

function groupRounds(rounds: Round[]) {
  const byGameId = new Map<string, Round[]>();
  for (const round of rounds) {
    const bucket = byGameId.get(round.gameId) ?? [];
    bucket.push(round);
    byGameId.set(round.gameId, bucket);
  }
  return byGameId;
}

function buildRow(
  game: Game,
  gameRounds: Round[],
  usernameById: Map<string, string>,
  comments: Record<string, string>,
): HistoryRow | null {
  if (gameRounds.length === 0) return null;
  const score = getGameScore(gameRounds);
  // Guard against any game marked finished without actually reaching target.
  if (game.finishedAt === null && getWinningTeam(score) === null) return null;
  const winnerTeam = score.teamA === score.teamB ? null : score.teamA > score.teamB ? "A" : "B";
  return {
    id: game.id,
    createdAt: game.createdAt,
    teamA: game.teams.teamA.map((id) => usernameById.get(id) ?? "Unknown"),
    teamB: game.teams.teamB.map((id) => usernameById.get(id) ?? "Unknown"),
    scoreA: score.teamA,
    scoreB: score.teamB,
    winnerTeam,
    comment: comments[game.id] ?? null,
  };
}

/**
 * Bez filtera: jedna stranica završenih partija (najnovije prve), a dohvaćaju se
 * samo ruke partija s te stranice pa cijena ne raste s brojem partija.
 * S filterima: filtriranje se radi nad keširanim datasetom računa (isti koji
 * koriste leaderboard i statistika), a straničenje se primjenjuje tek na rezultat.
 */
export async function getHistoryPage(
  accountId: string,
  filters: HistoryFilters,
  offset: number,
  limit: number,
): Promise<HistoryPageResult> {
  if (hasActiveFilters(filters)) {
    return getFilteredHistoryPage(accountId, filters, offset, limit);
  }

  const repo = getRepo(accountId);
  const [{ games, hasMore }, players] = await Promise.all([
    repo.listFinishedGamesPage(limit, offset),
    repo.listPlayers(),
  ]);
  const gameIds = games.map((game) => game.id);
  const [rounds, comments] = await Promise.all([
    games.length ? repo.listRoundsForGames(gameIds) : Promise.resolve([]),
    games.length ? loadComments(repo, gameIds) : Promise.resolve({}),
  ]);
  const roundsByGameId = groupRounds(rounds);
  const usernameById = new Map(players.map((player) => [player.id, player.username]));

  const rows: HistoryRow[] = [];
  for (const game of games) {
    const row = buildRow(game, roundsByGameId.get(game.id) ?? [], usernameById, comments);
    if (row) rows.push(row);
  }
  return { rows, hasMore, nextOffset: offset + limit };
}

async function getFilteredHistoryPage(
  accountId: string,
  filters: HistoryFilters,
  offset: number,
  limit: number,
): Promise<HistoryPageResult> {
  const repo = getRepo(accountId);
  const [{ players, games, rounds }, comments] = await Promise.all([
    getCachedDataset(accountId),
    loadComments(repo),
  ]);
  const roundsByGameId = groupRounds(rounds);
  const usernameById = new Map(players.map((player) => [player.id, player.username]));
  const query = filters.q?.toLowerCase();
  const pairIds = filters.pair?.split(":");
  // Perspektiva za pobjedu/poraz: par ako je zadan, inače igrač.
  const subjectIds = pairIds ?? (filters.playerId ? [filters.playerId] : null);

  const matches: HistoryRow[] = [];
  for (const game of games) {
    if (game.finishedAt === null) continue;
    const { teamA, teamB } = game.teams;
    if (filters.playerId && ![...teamA, ...teamB].includes(filters.playerId)) continue;
    if (pairIds) {
      const onA = pairIds.every((id) => teamA.includes(id));
      const onB = pairIds.every((id) => teamB.includes(id));
      if (!onA && !onB) continue;
    }
    if (filters.from || filters.to) {
      const day = zagrebDay(game.createdAt);
      if (filters.from && day < filters.from) continue;
      if (filters.to && day > filters.to) continue;
    }
    if (query && !(comments[game.id] ?? "").toLowerCase().includes(query)) continue;

    const row = buildRow(game, roundsByGameId.get(game.id) ?? [], usernameById, comments);
    if (!row) continue;

    if (filters.result && subjectIds) {
      // Igrač i par u istoj partiji uvijek su u istom timu (par je timski).
      const subjectTeam = subjectIds.every((id) => teamA.includes(id))
        ? "A"
        : subjectIds.every((id) => teamB.includes(id))
          ? "B"
          : null;
      if (!subjectTeam || !row.winnerTeam) continue;
      const won = row.winnerTeam === subjectTeam;
      if ((filters.result === "win") !== won) continue;
    }
    matches.push(row);
  }

  const rows = matches.slice(offset, offset + limit);
  return { rows, hasMore: offset + limit < matches.length, nextOffset: offset + limit };
}

/** Opcije za padajuće izbornike: svi igrači i parovi koji su zaista igrali zajedno. */
export async function getHistoryFilterOptions(
  accountId: string,
  onlyPlayerId?: string,
): Promise<HistoryFilterOptions> {
  const { players, games } = await getCachedDataset(accountId);
  const usernameById = new Map(players.map((player) => [player.id, player.username]));
  const pairs = new Map<string, string>();
  for (const game of games) {
    if (game.finishedAt === null) continue;
    for (const team of [game.teams.teamA, game.teams.teamB]) {
      if (onlyPlayerId && !team.includes(onlyPlayerId)) continue;
      const key = pairKeyOf(team[0], team[1]);
      if (pairs.has(key)) continue;
      const names = [team[0], team[1]]
        .map((id) => usernameById.get(id) ?? "Unknown")
        .sort((a, b) => a.localeCompare(b, "hr"));
      pairs.set(key, names.join(" + "));
    }
  }
  return {
    players: players
      .map((player) => ({ id: player.id, username: player.username }))
      .sort((a, b) => a.username.localeCompare(b.username, "hr")),
    pairs: [...pairs.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "hr")),
  };
}
