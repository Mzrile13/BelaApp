import { getCachedDataset, getCachedRatingData } from "@/lib/cachedStats";
import { seasonOf } from "@/lib/rating";
import { computeSeasonSummary } from "@/lib/season";

/** Podaci za /sezona i /sezona/[season]; `season` null = trenutna po datumu. */
export async function loadSeasonPage(accountId: string, season: string | null) {
  // Paralelno: rating data dijeli isto čitanje dataseta (lib/cachedStats.ts).
  const [dataset, ratingData] = await Promise.all([
    getCachedDataset(accountId),
    getCachedRatingData(accountId),
  ]);
  const currentSeason = seasonOf(new Date().toISOString());
  const active = season ?? currentSeason;
  const summary = computeSeasonSummary(active, ratingData, dataset.players, dataset.rounds);

  // Tek počela sezona bez partija: istakni pobjednike prethodne.
  const previousSeason = [...ratingData.seasons].reverse().find((item) => item < active) ?? null;
  const previous =
    season === null && summary.games === 0 && previousSeason
      ? computeSeasonSummary(previousSeason, ratingData, dataset.players, dataset.rounds)
      : null;

  return { active, currentSeason, seasons: ratingData.seasons, summary, previous };
}
