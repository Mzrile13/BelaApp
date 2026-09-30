import type { RatingGameEntry, RatingResult, ScoredGame } from "@/lib/rating";

/**
 * Serijalizabilni izvadak iz RatingResult (bez Mapova), da se može cachirati
 * kroz unstable_cache i proslijediti stranicama: graf rejtinga, sezone,
 * usporedba igrača i promjena rejtinga na kraju partije.
 */
export interface RatingData {
  historyByPlayer: Record<string, RatingGameEntry[]>;
  /** Završene partije kronološki, s rezultatom i sezonom. */
  scoredGames: ScoredGame[];
  /** Sezone koje imaju barem jednu završenu partiju, od najstarije. */
  seasons: string[];
  currentSeason: string | null;
}

export function toRatingData(rating: RatingResult): RatingData {
  const historyByPlayer: Record<string, RatingGameEntry[]> = {};
  for (const [playerId, playerRating] of rating.byPlayer) {
    historyByPlayer[playerId] = playerRating.history;
  }
  const seasons: string[] = [];
  for (const scored of rating.scoredGames) {
    if (seasons[seasons.length - 1] !== scored.season) seasons.push(scored.season);
  }
  return {
    historyByPlayer,
    scoredGames: rating.scoredGames,
    seasons,
    currentSeason: rating.currentSeason,
  };
}

/** Promjena rejtinga svakog igrača u jednoj partiji (prazno za nezavršenu). */
export function ratingDeltasForGame(data: RatingData, gameId: string) {
  const deltas: Record<string, number> = {};
  for (const [playerId, history] of Object.entries(data.historyByPlayer)) {
    const entry = history.find((item) => item.gameId === gameId);
    if (entry) deltas[playerId] = entry.delta;
  }
  return deltas;
}
