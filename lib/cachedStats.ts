import { unstable_cache } from "next/cache";
import { getRepo } from "@/lib/supabase";
import { computePairStats, computePlayerStats } from "@/lib/stats";
import type { PairStats, PlayerStats } from "@/lib/types";

// Tag used to invalidate all cached stats when a round/game changes.
export const STATS_CACHE_TAG = "stats";
const STATS_TTL_SECONDS = 30;

async function loadAll() {
  const repo = getRepo();
  const players = await repo.listPlayers();
  const games = await repo.listGames();
  const rounds = await repo.listRoundsForGames(games.map((game) => game.id));
  return { players, games, rounds };
}

// The leaderboard computations scan every round for every player/pair on each
// request. Cache the results (invalidated on any round/game mutation, with a
// 30s safety TTL) so repeated views don't re-run the whole scan.
// `unstable_cache` is the pre-Cache-Components primitive; still supported in 16.
export const getCachedPlayerStats = unstable_cache(
  async (): Promise<PlayerStats[]> => {
    const { players, games, rounds } = await loadAll();
    return computePlayerStats(players, games, rounds);
  },
  ["player-leaderboard"],
  { revalidate: STATS_TTL_SECONDS, tags: [STATS_CACHE_TAG] },
);

export const getCachedPairStats = unstable_cache(
  async (): Promise<PairStats[]> => {
    const { players, games, rounds } = await loadAll();
    return computePairStats(players, games, rounds);
  },
  ["pair-leaderboard"],
  { revalidate: STATS_TTL_SECONDS, tags: [STATS_CACHE_TAG] },
);
