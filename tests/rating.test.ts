import { describe, expect, it } from "vitest";
import { computeRatings, DEFAULT_RATING_CONFIG, expectedScore, seasonOf } from "../lib/rating";
import { computePlayerStats } from "../lib/stats";
import { mkFinishedGame, mkPlayer, repeatGames } from "./factories";
import type { Game, Round } from "../lib/types";

const [S, W, G, L, N1, N2, N3, N4] = [
  "strong",
  "weak",
  "good",
  "lucky",
  "n1",
  "n2",
  "n3",
  "n4",
].map((name, index) => mkPlayer(name, index + 1));

/** Deterministički "pobijedi u X od 10" bez oslanjanja na slučajnost. */
const winsOutOfTen = (index: number, wins: number) => index % 10 < wins;

describe("rating", () => {
  it("pobjednik dobiva, gubitnik gubi, a zbroj promjena po partiji je nula", () => {
    const { games, rounds } = repeatGames(1, () => ({
      teamA: [S.id, N1.id],
      teamB: [N2.id, N3.id],
      scoreA: 1001,
      scoreB: 500,
    }));

    const result = computeRatings(games, rounds);
    const strong = result.byPlayer.get(S.id);
    const loser = result.byPlayer.get(N2.id);

    expect(strong?.rating).toBeGreaterThan(DEFAULT_RATING_CONFIG.initialRating);
    expect(loser?.rating).toBeLessThan(DEFAULT_RATING_CONFIG.initialRating);

    const totalDelta = Array.from(result.byPlayer.values())
      .flatMap((player) => player.history)
      .filter((entry) => entry.gameId === games[0].id)
      .reduce((sum, entry) => sum + entry.delta, 0);
    expect(Math.abs(totalDelta)).toBeLessThan(1e-9);
  });

  it("uvjerljivija pobjeda pomiče rejting više od tijesne", () => {
    const close = repeatGames(1, () => ({
      teamA: [S.id, N1.id],
      teamB: [N2.id, N3.id],
      scoreA: 1001,
      scoreB: 990,
    }));
    const blowout = repeatGames(1, () => ({
      teamA: [S.id, N1.id],
      teamB: [N2.id, N3.id],
      scoreA: 1001,
      scoreB: 120,
    }));

    const closeRating = computeRatings(close.games, close.rounds).byPlayer.get(S.id)?.rating ?? 0;
    const blowoutRating =
      computeRatings(blowout.games, blowout.rounds).byPlayer.get(S.id)?.rating ?? 0;

    expect(blowoutRating).toBeGreaterThan(closeRating);
  });

  it("rejting je tranzitivan i kad se timovi nikad nisu sreli", () => {
    // A tuče B, B tuče C, A i C nikad ne igraju jedni protiv drugih.
    const aVsB = repeatGames(30, (i) => ({
      teamA: [S.id, W.id] as [string, string],
      teamB: [G.id, L.id] as [string, string],
      scoreA: winsOutOfTen(i, 9) ? 1001 : 600,
      scoreB: winsOutOfTen(i, 9) ? 600 : 1001,
    }));
    const bVsC = repeatGames(
      30,
      (i) => ({
        teamA: [G.id, L.id] as [string, string],
        teamB: [N1.id, N2.id] as [string, string],
        scoreA: winsOutOfTen(i, 9) ? 1001 : 600,
        scoreB: winsOutOfTen(i, 9) ? 600 : 1001,
      }),
      100,
    );

    const result = computeRatings(
      [...aVsB.games, ...bVsC.games],
      [...aVsB.rounds, ...bVsC.rounds],
    );
    const rating = (id: string) => result.byPlayer.get(id)?.rating ?? 0;
    const teamA = (rating(S.id) + rating(W.id)) / 2;
    const teamB = (rating(G.id) + rating(L.id)) / 2;
    const teamC = (rating(N1.id) + rating(N2.id)) / 2;

    expect(teamA).toBeGreaterThan(teamB);
    expect(teamB).toBeGreaterThan(teamC);
  });

  it("razdvaja igrača od partnera: isti postotak pobjeda, različit rejting", () => {
    // Ovo je svojstvo koje stari mvpScore nije imao. G i L imaju identičan
    // omjer pobjeda (50%), ali G to postiže noseći slabog partnera, a L uz
    // jakog partnera — pa G mora biti bolji igrač.
    const buildStrong = repeatGames(
      24,
      (i) => ({
        teamA: [S.id, N1.id] as [string, string],
        teamB: [N2.id, N3.id] as [string, string],
        scoreA: winsOutOfTen(i, 9) ? 1001 : 600,
        scoreB: winsOutOfTen(i, 9) ? 600 : 1001,
      }),
      0,
    );
    const buildWeak = repeatGames(
      24,
      (i) => ({
        teamA: [W.id, N1.id] as [string, string],
        teamB: [N2.id, N3.id] as [string, string],
        scoreA: winsOutOfTen(i, 1) ? 1001 : 600,
        scoreB: winsOutOfTen(i, 1) ? 600 : 1001,
      }),
      100,
    );
    // G nosi slabog W do 50%.
    const goodWithWeak = repeatGames(
      24,
      (i) => ({
        teamA: [G.id, W.id] as [string, string],
        teamB: [N2.id, N3.id] as [string, string],
        scoreA: winsOutOfTen(i, 5) ? 1001 : 600,
        scoreB: winsOutOfTen(i, 5) ? 600 : 1001,
      }),
      200,
    );
    // L uz jakog S dolazi samo do istih 50%.
    const luckyWithStrong = repeatGames(
      24,
      (i) => ({
        teamA: [L.id, S.id] as [string, string],
        teamB: [N2.id, N3.id] as [string, string],
        scoreA: winsOutOfTen(i, 5) ? 1001 : 600,
        scoreB: winsOutOfTen(i, 5) ? 600 : 1001,
      }),
      300,
    );

    const games = [
      ...buildStrong.games,
      ...buildWeak.games,
      ...goodWithWeak.games,
      ...luckyWithStrong.games,
    ];
    const rounds = [
      ...buildStrong.rounds,
      ...buildWeak.rounds,
      ...goodWithWeak.rounds,
      ...luckyWithStrong.rounds,
    ];

    const stats = computePlayerStats([S, W, G, L, N1, N2, N3, N4], games, rounds);
    const good = stats.find((row) => row.playerId === G.id);
    const lucky = stats.find((row) => row.playerId === L.id);

    // Preduvjet: po starom mjerilu (postotak pobjeda) njih dvoje su izjednačeni.
    expect(good?.gamesWon).toBe(lucky?.gamesWon);
    expect(good?.gamesPlayed).toBe(lucky?.gamesPlayed);
    // Ali rejting ih razdvaja.
    expect(good?.rating ?? 0).toBeGreaterThan(lucky?.rating ?? 0);
  });

  it("sigma pada s brojem partija, pa konzervativni rejting kažnjava mali uzorak", () => {
    const many = repeatGames(30, (i) => ({
      teamA: [S.id, N1.id] as [string, string],
      teamB: [N2.id, N3.id] as [string, string],
      scoreA: winsOutOfTen(i, 7) ? 1001 : 600,
      scoreB: winsOutOfTen(i, 7) ? 600 : 1001,
    }));
    const few = repeatGames(
      2,
      () => ({
        teamA: [G.id, N4.id] as [string, string],
        teamB: [N2.id, N3.id] as [string, string],
        scoreA: 1001,
        scoreB: 300,
      }),
      500,
    );

    const result = computeRatings(
      [...many.games, ...few.games],
      [...many.rounds, ...few.rounds],
    );
    const veteran = result.byPlayer.get(S.id);
    const rookie = result.byPlayer.get(G.id);

    expect(veteran?.sigma ?? 0).toBeLessThan(rookie?.sigma ?? 0);
    expect(veteran?.confidence ?? 0).toBeGreaterThan(rookie?.confidence ?? 0);
    expect(rookie?.conservativeRating ?? 0).toBeLessThan(rookie?.rating ?? 0);
  });

  it("prijelaz sezone vuče rejting prema početnom", () => {
    const games: Game[] = [];
    const rounds: Round[] = [];
    for (let i = 0; i < 20; i += 1) {
      const built = mkFinishedGame(
        `s1-${i}`,
        [S.id, N1.id],
        [N2.id, N3.id],
        1001,
        400,
        `2026-01-${String(i + 1).padStart(2, "0")}T12:00:00.000Z`,
      );
      games.push(built.game);
      rounds.push(...built.rounds);
    }
    const nextSeason = mkFinishedGame(
      "s2-0",
      [S.id, N1.id],
      [N2.id, N3.id],
      1001,
      400,
      "2027-01-05T12:00:00.000Z",
    );
    games.push(nextSeason.game);
    rounds.push(...nextSeason.rounds);

    const result = computeRatings(games, rounds);
    const history = result.byPlayer.get(S.id)?.history ?? [];
    const lastOfSeason1 = history.filter((entry) => entry.season === "25/26").at(-1);
    const firstOfSeason2 = history.find((entry) => entry.season === "26/27");

    expect(result.currentSeason).toBe("26/27");
    expect(firstOfSeason2?.ratingBefore ?? 0).toBeLessThan(lastOfSeason1?.ratingAfter ?? 0);
    // Povučeno je točno za zadani udio prema početnom rejtingu.
    const expectedAfterRegression =
      DEFAULT_RATING_CONFIG.initialRating +
      ((lastOfSeason1?.ratingAfter ?? 0) - DEFAULT_RATING_CONFIG.initialRating) *
        (1 - DEFAULT_RATING_CONFIG.seasonRegression);
    expect(firstOfSeason2?.ratingBefore ?? 0).toBeCloseTo(expectedAfterRegression, 6);
  });

  it("sezona ide od listopada do rujna", () => {
    // Ista kalendarska godina, a dvije različite sezone.
    expect(seasonOf("2025-09-30T23:00:00.000Z")).toBe("24/25");
    expect(seasonOf("2025-10-01T00:00:00.000Z")).toBe("25/26");
    expect(seasonOf("2026-01-15T12:00:00.000Z")).toBe("25/26");
    expect(seasonOf("2026-09-30T12:00:00.000Z")).toBe("25/26");
    expect(seasonOf("2026-10-01T00:00:00.000Z")).toBe("26/27");
    // Prijelaz stoljeća ostaje dvoznamenkast.
    expect(seasonOf("2099-10-01T00:00:00.000Z")).toBe("99/00");
  });

  it("regresija se okida na 1. listopada, ne na Novu godinu", () => {
    const games: Game[] = [];
    const rounds: Round[] = [];
    const add = (id: string, createdAt: string) => {
      const built = mkFinishedGame(id, [S.id, N1.id], [N2.id, N3.id], 1001, 400, createdAt);
      games.push(built.game);
      rounds.push(...built.rounds);
    };

    // Cijela sezona 25/26 unutar dvije kalendarske godine.
    for (let i = 0; i < 10; i += 1) add(`a${i}`, `2025-11-${String(i + 1).padStart(2, "0")}T12:00:00.000Z`);
    for (let i = 0; i < 10; i += 1) add(`b${i}`, `2026-02-${String(i + 1).padStart(2, "0")}T12:00:00.000Z`);
    // Prva partija nove sezone.
    add("c0", "2026-10-02T12:00:00.000Z");

    const history = computeRatings(games, rounds).byPlayer.get(S.id)?.history ?? [];
    const newYear = history.find((entry) => entry.gameId === "b0");
    const newSeason = history.find((entry) => entry.gameId === "c0");
    const lastOfOldSeason = history.filter((entry) => entry.season === "25/26").at(-1);

    // Nova kalendarska godina NE okida regresiju — rejting samo nastavlja rasti.
    expect(newYear?.ratingBefore ?? 0).toBeGreaterThan(
      history.find((entry) => entry.gameId === "a9")?.ratingBefore ?? 0,
    );
    // Listopad okida.
    expect(newSeason?.season).toBe("26/27");
    expect(newSeason?.ratingBefore ?? 0).toBeCloseTo(
      DEFAULT_RATING_CONFIG.initialRating +
        ((lastOfOldSeason?.ratingAfter ?? 0) - DEFAULT_RATING_CONFIG.initialRating) *
          (1 - DEFAULT_RATING_CONFIG.seasonRegression),
      6,
    );
  });

  it("expectedScore je simetričan i monoton", () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 10);
    expect(expectedScore(1900, 1500)).toBeCloseTo(1 - expectedScore(1500, 1900), 10);
    expect(expectedScore(1600, 1500)).toBeGreaterThan(expectedScore(1550, 1500));
  });

  it("nezavršene partije ne ulaze u rejting", () => {
    const built = mkFinishedGame("unfinished", [S.id, N1.id], [N2.id, N3.id], 300, 200, "2026-03-01T12:00:00.000Z");
    const openGame = { ...built.game, finishedAt: null };
    const result = computeRatings([openGame], built.rounds);
    expect(result.scoredGames).toHaveLength(0);
    expect(result.byPlayer.size).toBe(0);
  });
});
