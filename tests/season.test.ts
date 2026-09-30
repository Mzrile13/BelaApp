import { describe, expect, it } from "vitest";
import { computeRatings } from "../lib/rating";
import { ratingDeltasForGame, toRatingData } from "../lib/ratingHistory";
import { computeSeasonSummary, MVP_MIN_GAMES, seasonFromSlug, seasonSlug } from "../lib/season";
import { mkFinishedGame, mkPlayer } from "./factories";
import type { Game, Round } from "../lib/types";

const players = ["ana", "bruno", "cvita", "duje", "ema"].map((name, i) => mkPlayer(name, i + 1));
const [A, B, C, D, E] = players;

function build(specs: Array<{ teamA: [string, string]; teamB: [string, string]; scoreA: number; scoreB: number; at: string }>) {
  const games: Game[] = [];
  const rounds: Round[] = [];
  specs.forEach((spec, index) => {
    const built = mkFinishedGame(`g${index}`, spec.teamA, spec.teamB, spec.scoreA, spec.scoreB, spec.at);
    games.push(built.game);
    rounds.push(...built.rounds);
  });
  return { games, rounds };
}

describe("sezona", () => {
  it("slug i natrag", () => {
    expect(seasonSlug("25/26")).toBe("25-26");
    expect(seasonFromSlug("25-26")).toBe("25/26");
    expect(seasonFromSlug("../x")).toBeNull();
  });

  it("partije se dijele po granici 1. listopada", () => {
    const { games, rounds } = build([
      { teamA: [A.id, B.id], teamB: [C.id, D.id], scoreA: 1001, scoreB: 400, at: "2026-09-30T20:00:00.000Z" },
      { teamA: [A.id, B.id], teamB: [C.id, D.id], scoreA: 1001, scoreB: 400, at: "2026-10-01T20:00:00.000Z" },
    ]);
    const data = toRatingData(computeRatings(games, rounds));
    expect(data.seasons).toEqual(["25/26", "26/27"]);
    expect(computeSeasonSummary("25/26", data, players, rounds).games).toBe(1);
    expect(computeSeasonSummary("26/27", data, players, rounds).games).toBe(1);
  });

  it("MVP broji partije u toj sezoni, ne ukupno", () => {
    // Ema je odigrala puno u prošloj sezoni, a u novoj samo jednu (s velikim skokom).
    const old = Array.from({ length: 6 }, (_, i) => ({
      teamA: [E.id, D.id] as [string, string],
      teamB: [B.id, C.id] as [string, string],
      scoreA: 1001,
      scoreB: 900,
      at: `2026-0${(i % 8) + 1}-10T10:00:00.000Z`,
    }));
    const fresh = [
      { teamA: [E.id, D.id] as [string, string], teamB: [A.id, C.id] as [string, string], scoreA: 1001, scoreB: 100, at: "2026-10-02T10:00:00.000Z" },
      ...Array.from({ length: MVP_MIN_GAMES }, (_, i) => ({
        teamA: [A.id, B.id] as [string, string],
        teamB: [C.id, D.id] as [string, string],
        scoreA: 1001,
        scoreB: 800,
        at: `2026-10-${String(i + 3).padStart(2, "0")}T10:00:00.000Z`,
      })),
    ];
    const { games, rounds } = build([...old, ...fresh]);
    const data = toRatingData(computeRatings(games, rounds));
    const summary = computeSeasonSummary("26/27", data, players, rounds);
    expect(summary.players.find((row) => row.playerId === E.id)?.games).toBe(1);
    expect(summary.mvp?.playerId).not.toBe(E.id);
    expect(summary.mvp?.games).toBeGreaterThanOrEqual(MVP_MIN_GAMES);
  });

  it("prvak parova treba minimum partija, a najveća pobjeda je po razlici", () => {
    const { games, rounds } = build([
      // C+D: 1 od 1 (100%), ali premalo partija
      { teamA: [C.id, D.id], teamB: [A.id, E.id], scoreA: 1001, scoreB: 200, at: "2026-10-02T10:00:00.000Z" },
      // A+B: 3 od 4
      ...[0, 1, 2, 3].map((i) => ({
        teamA: [A.id, B.id] as [string, string],
        teamB: [E.id, i === 3 ? D.id : C.id] as [string, string],
        scoreA: i === 3 ? 700 : 1001,
        scoreB: i === 3 ? 1001 : 950,
        at: `2026-10-${String(i + 3).padStart(2, "0")}T10:00:00.000Z`,
      })),
    ]);
    const data = toRatingData(computeRatings(games, rounds));
    const summary = computeSeasonSummary("26/27", data, players, rounds);
    expect([summary.pairChampion?.playerAId, summary.pairChampion?.playerBId]).toEqual([A.id, B.id].sort());
    expect(summary.pairChampion?.wins).toBe(3);
    expect(summary.biggestWin).toMatchObject({ gameId: "g0", margin: 801, winner: "A" });
  });

  it("delte rejtinga za partiju se zbrajaju u nulu", () => {
    const { games, rounds } = build([
      { teamA: [A.id, B.id], teamB: [C.id, D.id], scoreA: 1001, scoreB: 400, at: "2026-10-02T10:00:00.000Z" },
    ]);
    const deltas = ratingDeltasForGame(toRatingData(computeRatings(games, rounds)), "g0");
    expect(Object.keys(deltas).sort()).toEqual([A.id, B.id, C.id, D.id].sort());
    expect(deltas[A.id]).toBeGreaterThan(0);
    expect(Math.abs(Object.values(deltas).reduce((s, v) => s + v, 0))).toBeLessThan(1e-9);
  });
});
