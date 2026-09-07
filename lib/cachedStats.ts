import { unstable_cache } from "next/cache";
import { getRepo } from "@/lib/supabase";
import { computePairStats, computePlayerStats } from "@/lib/stats";
import type { PairStats, PlayerStats } from "@/lib/types";

/**
 * Tag za invalidaciju statistike jednog računa. Mora biti po računu — inače bi
 * runda odigrana u jednoj grupi rušila cache svih ostalih.
 */
export function statsTag(accountId: string) {
  return `stats:${accountId}`;
}

const STATS_TTL_SECONDS = 30;

async function loadAll(accountId: string) {
  const repo = getRepo(accountId);
  const players = await repo.listPlayers();
  const games = await repo.listGames();
  const rounds = await repo.listRoundsForGames(games.map((game) => game.id));
  return { players, games, rounds };
}

// The leaderboard computations scan every round for every player/pair on each
// request. Cache the results (invalidated on any round/game mutation, with a
// 30s safety TTL) so repeated views don't re-run the whole scan.
// `unstable_cache` is the pre-Cache-Components primitive; still supported in 16.
//
// Cachirana funkcija se gradi PO RAČUNU, jer i `tags` i `keyParts` moraju
// sadržavati accountId: tag zato da revalidateTag pogodi samo svoju grupu, a
// ključ zato da dvije grupe ne dijele istu cache stavku. Ovo je i razlog zašto
// se accountId prosljeđuje izvana — dokumentacija zabranjuje čitanje
// cookies()/headers() unutar cache scopea.
function playerStatsFor(accountId: string) {
  return unstable_cache(
    async (): Promise<PlayerStats[]> => {
      const { players, games, rounds } = await loadAll(accountId);
      return computePlayerStats(players, games, rounds);
    },
    ["player-leaderboard", accountId],
    { revalidate: STATS_TTL_SECONDS, tags: [statsTag(accountId)] },
  );
}

function pairStatsFor(accountId: string) {
  return unstable_cache(
    async (): Promise<PairStats[]> => {
      const { players, games, rounds } = await loadAll(accountId);
      return computePairStats(players, games, rounds);
    },
    ["pair-leaderboard", accountId],
    { revalidate: STATS_TTL_SECONDS, tags: [statsTag(accountId)] },
  );
}

export function getCachedPlayerStats(accountId: string) {
  return playerStatsFor(accountId)();
}

export function getCachedPairStats(accountId: string) {
  return pairStatsFor(accountId)();
}
