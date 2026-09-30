import { revalidateTag, unstable_cache } from "next/cache";
import { getRepo } from "@/lib/supabase";
import { computeRatings } from "@/lib/rating";
import { toRatingData, type RatingData } from "@/lib/ratingHistory";
import { computeAllStats } from "@/lib/stats";
import type { Game, PairStats, Player, PlayerStats, Round } from "@/lib/types";

/**
 * Tag za invalidaciju statistike jednog računa. Mora biti po računu — inače bi
 * runda odigrana u jednoj grupi rušila cache svih ostalih.
 */
export function statsTag(accountId: string) {
  return `stats:${accountId}`;
}

const STATS_TTL_SECONDS = 30;

/**
 * Poziva se nakon svake izmjene partije/ruke.
 *
 * `immediate` (expire: 0): sljedeći zahtjev ČEKA svježi izračun. Za izmjene
 * koje mijenjaju statistiku ili popis aktivnih partija: nova/obrisana partija,
 * ruka koja završava partiju, izmjena završene partije. Bez toga bi ekran
 * pobjede ostao bez promjene rejtinga upravo završene partije.
 *
 * Inače "max" (stale-while-revalidate): obična ruka u partiji koja traje ne
 * ulazi u statistiku (broje se samo završene partije), pa nema smisla da
 * sljedeća stranica čeka ponovni dohvat svih ruku računa.
 */
export function invalidateStats(accountId: string, { immediate }: { immediate: boolean }) {
  revalidateTag(statsTag(accountId), immediate ? { expire: 0 } : "max");
}

export interface AccountDataset {
  players: Player[];
  games: Game[];
  rounds: Round[];
}

// Cjelovita povijest računa. Stranice igrača i para trebaju iste te retke kao i
// leaderboard, pa ih dijele kroz ovaj cache umjesto da svaka radi vlastiti puni
// scan. Isti tag kao statistika: svaka izmjena partije/ruke ruši oboje.
function datasetFor(accountId: string) {
  return unstable_cache(
    async (): Promise<AccountDataset> => {
      const repo = getRepo(accountId);
      // Sve tri tablice u jednom paralelnom krugu (ruke po računu, ne po popisu
      // id-eva partija, pa ne čekaju da partije stignu).
      const [players, games, rounds] = await Promise.all([
        repo.listPlayers(),
        repo.listGames(),
        repo.listAllRounds(),
      ]);
      return { players, games, rounds };
    },
    ["dataset", accountId],
    { revalidate: STATS_TTL_SECONDS, tags: [statsTag(accountId)] },
  );
}

export function getCachedDataset(accountId: string) {
  return datasetFor(accountId)();
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
function allStatsFor(accountId: string) {
  return unstable_cache(
    async (): Promise<{ players: PlayerStats[]; pairs: PairStats[]; season: string | null }> => {
      const { players, games, rounds } = await getCachedDataset(accountId);
      // Igrači i parovi dijele jedan prolaz kroz povijest (rejting para se
      // izvodi iz rejtinga igrača), pa se cachiraju zajedno — prije su se dvije
      // cache stavke računale odvojeno i svaka je iznutra radila oba posla.
      const { players: playerStats, pairs, rating } = computeAllStats(players, games, rounds);
      // `rating` sadrži Mapove pa se ne serijalizira u cache — prosljeđuje se
      // samo skalarni podatak koji UI treba.
      return { players: playerStats, pairs, season: rating.currentSeason };
    },
    ["leaderboard", accountId],
    { revalidate: STATS_TTL_SECONDS, tags: [statsTag(accountId)] },
  );
}

export function getCachedAllStats(accountId: string) {
  return allStatsFor(accountId)();
}

export async function getCachedPlayerStats(accountId: string) {
  return (await getCachedAllStats(accountId)).players;
}

export async function getCachedPairStats(accountId: string) {
  return (await getCachedAllStats(accountId)).pairs;
}

// Povijest rejtinga po partiji (graf, sezone, usporedba, delta na kraju
// partije). Zasebna stavka jer je velika, a treba je manje stranica nego
// leaderboard. Isti tag, pa je invalidira svaka izmjena partije/ruke.
function ratingDataFor(accountId: string) {
  return unstable_cache(
    async (): Promise<RatingData> => {
      const { games, rounds } = await getCachedDataset(accountId);
      return toRatingData(computeRatings(games, rounds));
    },
    ["rating-data", accountId],
    { revalidate: STATS_TTL_SECONDS, tags: [statsTag(accountId)] },
  );
}

export function getCachedRatingData(accountId: string) {
  return ratingDataFor(accountId)();
}
