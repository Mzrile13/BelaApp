import { GAME_TARGET_SCORE, getFinishedGameIds, getGameScore, groupRoundsByGame } from "@/lib/scoring";
import type { Game, Round, TeamId } from "@/lib/types";

/**
 * Ekipni Elo za belu.
 *
 * Zašto Elo, a ne zbroj "dobrih" statistika: u zatvorenoj ekipi prijatelja
 * postotak pobjeda ne mjeri igrača nego i to s kim je i protiv koga igrao.
 * Elo po konstrukciji dijeli zaslugu između partnera i korigira je na jačinu
 * protivnika, pa je jedini broj koji smije biti "ranking".
 *
 * Tri odstupanja od udžbeničkog Ela, sva zbog toga što je bela utrka do 1001:
 *
 * 1. MARGINA. Partija nosi puno više informacije od jednog bita (1001:980 nije
 *    isto što i 1001:250), pa margina skalira K.
 *
 *    Ovdje je namjerno IZOSTAVLJENO 538-ovo prigušenje favorita
 *    (`2.2 / (0.001 * razlikaRejtinga + 2.2)`). Ono asimetrično smanjuje korak
 *    kad pobijedi favorit, a povećava ga kad pobijedi autsajder, što ne pomiče
 *    samo brzinu nego i ravnotežu — sustavno stišće ljestvicu prema sredini.
 *    Mjereno na simulaciji sa zadanim pravim rejtinzima, nagib regresije
 *    procijenjenog na pravi rejting (1.0 = nepristrano) rastao je s prigušenjem
 *    0.80 na 0.91 bez njega pri 60 partija, 0.80 -> 0.93 pri 150 i
 *    0.74 -> 0.86 pri 400. Margina u K bez prigušenja nije pristrana jer skalira
 *    korak simetrično za oba ishoda.
 * 2. VIŠE PROLAZA. Jedan kronološki prolaz sudi rane partije krivim priorima
 *    (svi na 1500). Ponovljeni prolazi, gdje završni rejtinzi postaju početni,
 *    uklanjaju ovisnost o redoslijedu i konvergiraju blizu Bradley-Terry
 *    rješenja, a i dalje daju "+14 večeras" po partiji.
 * 3. NESIGURNOST. Umjesto binarnog praga "premalo partija", svaki igrač ima
 *    sigmu koja pada s brojem partija; ljestvica se sortira po `rating − sigma`.
 *    Tko je odigrao tri partije rangira se nisko dok se ne dokaže, ali je i
 *    dalje na listi.
 *
 * Runde se namjerno NE ubacuju kao zasebni dokazi: unutar partije su timovi
 * fiksni pa runde nisu nezavisne, a završna margina ionako sažima sve što nose.
 */

export interface RatingConfig {
  /** Polazni rejting novog igrača. */
  initialRating: number;
  /** K za prvih `provisionalGames` partija u prvom prolazu. */
  kProvisional: number;
  /** K nakon toga i u svim kasnijim prolazima. */
  kEstablished: number;
  provisionalGames: number;
  /** Broj prolazaka kroz povijest; 1 = klasični online Elo. */
  passes: number;
  /** Koliko se rejting povuče prema početnom na prijelazu sezone (0–1). */
  seasonRegression: number;
  /** Broj partija na kojem pouzdanost dosegne 50%. */
  confidenceK: number;
  /** Sigma potpuno nepoznatog igrača, u Elo bodovima. */
  sigmaBase: number;
  /** Koliko zadnjih partija ulazi u "formu". */
  formWindow: number;
}

export const DEFAULT_RATING_CONFIG: RatingConfig = {
  initialRating: 1500,
  kProvisional: 48,
  kEstablished: 24,
  provisionalGames: 10,
  passes: 4,
  seasonRegression: 0.25,
  confidenceK: 12,
  sigmaBase: 120,
  formWindow: 10,
};

export interface RatingGameEntry {
  gameId: string;
  createdAt: string;
  season: string;
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
  won: boolean;
  /** Očekivani udio pobjede tima ovog igrača prije partije. */
  expected: number;
}

export interface PlayerRating {
  playerId: string;
  rating: number;
  /** Konzervativni rejting (`rating − sigma`) — po njemu se sortira ljestvica. */
  conservativeRating: number;
  sigma: number;
  /** 0–1; koliko vjerujemo rejtingu. */
  confidence: number;
  gamesRated: number;
  peakRating: number;
  /** Promjena rejtinga kroz zadnjih `formWindow` partija. */
  formDelta: number;
  /** Promjena rejtinga unutar tekuće sezone. */
  seasonDelta: number;
  /** Zadnjih do 20 vrijednosti rejtinga, za sparkline. */
  trail: number[];
  history: RatingGameEntry[];
}

/** Završena partija s rezultatom, kronološki — dijeljena osnova za sve izvedene metrike. */
export interface ScoredGame {
  game: Game;
  scoreA: number;
  scoreB: number;
  winner: TeamId | null;
  season: string;
}

export interface RatingResult {
  byPlayer: Map<string, PlayerRating>;
  /** Završene partije, kronološki. */
  scoredGames: ScoredGame[];
  currentSeason: string | null;
  config: RatingConfig;
}

/** Očekivani udio pobjede tima prema Elo razlici. */
export function expectedScore(teamRating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - teamRating) / 400));
}

/** Mjesec u kojem počinje nova sezona (10 = listopad). */
export const SEASON_START_MONTH = 10;

/**
 * Sezona ide od 1. listopada do 30. rujna i označava se kao "25/26".
 * Ne poklapa se s kalendarskom godinom da nova sezona ne bi počinjala usred
 * zime, kad se najviše igra.
 *
 * Oznaka služi samo za usporedbu na jednakost i za prikaz — partije su već
 * kronološki poredane, pa se sezone nikad ne sortiraju po tekstu.
 */
export function seasonOf(createdAt: string) {
  const year = Number(createdAt.slice(0, 4));
  const month = Number(createdAt.slice(5, 7));
  if (!Number.isFinite(year) || !Number.isFinite(month)) return createdAt.slice(0, 4);
  const startYear = month >= SEASON_START_MONTH ? year : year - 1;
  const short = (value: number) => String(((value % 100) + 100) % 100).padStart(2, "0");
  return `${short(startYear)}/${short(startYear + 1)}`;
}

/**
 * Margina skalira K u rasponu ~[0.75, 1.65]: tijesna partija pomiče rejting
 * manje od uvjerljive, ali je nikad ne poništava.
 */
function marginMultiplier(scoreWinner: number, scoreLoser: number) {
  const margin = Math.min(1.25, Math.max(0, (scoreWinner - scoreLoser) / GAME_TARGET_SCORE));
  return 0.75 + 0.5 * Math.log(1 + 4 * margin);
}

function playersOf(game: Game): string[] {
  return [game.teams.teamA[0], game.teams.teamA[1], game.teams.teamB[0], game.teams.teamB[1]];
}

/** Završene partije s rezultatom, kronološki (id kao stabilan tie-break). */
export function getScoredGames(games: Game[], rounds: Round[]): ScoredGame[] {
  const finishedIds = getFinishedGameIds(games, rounds);
  const roundsByGame = groupRoundsByGame(rounds);
  return games
    .filter((game) => finishedIds.has(game.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    .map((game) => {
      const score = getGameScore(roundsByGame.get(game.id) ?? []);
      const winner: TeamId | null =
        score.teamA === score.teamB ? null : score.teamA > score.teamB ? "A" : "B";
      return {
        game,
        scoreA: score.teamA,
        scoreB: score.teamB,
        winner,
        season: seasonOf(game.createdAt),
      };
    });
}

export function computeRatings(
  games: Game[],
  rounds: Round[],
  config: RatingConfig = DEFAULT_RATING_CONFIG,
): RatingResult {
  const scoredGames = getScoredGames(games, rounds);
  const currentSeason = scoredGames.length ? scoredGames[scoredGames.length - 1].season : null;

  // Prior sljedećeg prolaza = završni rejtinzi prethodnog. Elo je zbroj-nula po
  // partiji, pa prijenos ne napuhava ukupnu sumu.
  let priors = new Map<string, number>();
  let histories = new Map<string, RatingGameEntry[]>();

  for (let pass = 0; pass < Math.max(1, config.passes); pass += 1) {
    const isFinalPass = pass === Math.max(1, config.passes) - 1;
    const ratings = new Map(priors);
    const played = new Map<string, number>();
    const passHistories = new Map<string, RatingGameEntry[]>();
    let previousSeason: string | null = null;

    const ratingOf = (playerId: string) => ratings.get(playerId) ?? config.initialRating;

    for (const scored of scoredGames) {
      if (previousSeason !== null && scored.season !== previousSeason) {
        // Prijelaz sezone: povuci sve prema početnom rejtingu.
        for (const [playerId, value] of ratings) {
          ratings.set(
            playerId,
            config.initialRating + (value - config.initialRating) * (1 - config.seasonRegression),
          );
        }
      }
      previousSeason = scored.season;

      const { game } = scored;
      const teamAIds = game.teams.teamA;
      const teamBIds = game.teams.teamB;
      const ratingA = (ratingOf(teamAIds[0]) + ratingOf(teamAIds[1])) / 2;
      const ratingB = (ratingOf(teamBIds[0]) + ratingOf(teamBIds[1])) / 2;
      const expectedA = expectedScore(ratingA, ratingB);
      const actualA = scored.winner === null ? 0.5 : scored.winner === "A" ? 1 : 0;

      const mult =
        scored.winner === null
          ? 1
          : marginMultiplier(
              Math.max(scored.scoreA, scored.scoreB),
              Math.min(scored.scoreA, scored.scoreB),
            );

      for (const [ids, actual, expected] of [
        [teamAIds, actualA, expectedA] as const,
        [teamBIds, 1 - actualA, 1 - expectedA] as const,
      ]) {
        for (const playerId of ids) {
          const games = played.get(playerId) ?? 0;
          // Provizorni (veći) K samo u prvom prolazu — u kasnijima su rejtinzi
          // već približno točni pa bi veliki skokovi bili samo šum.
          const k =
            pass === 0 && games < config.provisionalGames
              ? config.kProvisional
              : config.kEstablished;
          const before = ratingOf(playerId);
          const delta = k * mult * (actual - expected);
          const after = before + delta;
          ratings.set(playerId, after);
          played.set(playerId, games + 1);

          if (isFinalPass) {
            const bucket = passHistories.get(playerId) ?? [];
            bucket.push({
              gameId: game.id,
              createdAt: game.createdAt,
              season: scored.season,
              ratingBefore: before,
              ratingAfter: after,
              delta,
              won: actual > 0.5,
              expected,
            });
            passHistories.set(playerId, bucket);
          }
        }
      }
    }

    priors = ratings;
    if (isFinalPass) histories = passHistories;
  }

  const byPlayer = new Map<string, PlayerRating>();
  const everyone = new Set<string>();
  for (const scored of scoredGames) {
    for (const playerId of playersOf(scored.game)) everyone.add(playerId);
  }

  for (const playerId of everyone) {
    const history = histories.get(playerId) ?? [];
    const rating = priors.get(playerId) ?? config.initialRating;
    const gamesRated = history.length;
    const confidence = gamesRated / (gamesRated + config.confidenceK);
    const sigma = config.sigmaBase * (1 - confidence);
    const form = history.slice(-config.formWindow);
    const seasonEntries = currentSeason
      ? history.filter((entry) => entry.season === currentSeason)
      : [];

    byPlayer.set(playerId, {
      playerId,
      rating,
      conservativeRating: rating - sigma,
      sigma,
      confidence,
      gamesRated,
      peakRating: history.reduce(
        (max, entry) => Math.max(max, entry.ratingAfter),
        gamesRated ? history[0].ratingBefore : rating,
      ),
      formDelta: form.reduce((sum, entry) => sum + entry.delta, 0),
      seasonDelta: seasonEntries.reduce((sum, entry) => sum + entry.delta, 0),
      trail: history.slice(-20).map((entry) => entry.ratingAfter),
      history,
    });
  }

  return { byPlayer, scoredGames, currentSeason, config };
}
