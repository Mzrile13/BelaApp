import { describe, expect, it } from "vitest";
import { computeHeadToHead } from "../lib/headToHead";
import { getScoredGames } from "../lib/rating";
import { mkFinishedGame, mkGame, mkPlayer } from "./factories";

const [A, B, C, D] = ["ana", "bruno", "cvita", "duje"].map((name, i) => mkPlayer(name, i + 1));

describe("usporedba igrača", () => {
  it("razdvaja partije kao protivnici i kao partneri", () => {
    const specs = [
      mkFinishedGame("g1", [A.id, B.id], [C.id, D.id], 1001, 600, "2026-10-01T10:00:00.000Z"), // A vs C: A pobijedi
      mkFinishedGame("g2", [A.id, D.id], [C.id, B.id], 500, 1001, "2026-10-02T10:00:00.000Z"), // A vs C: C pobijedi
      mkFinishedGame("g3", [C.id, D.id], [A.id, B.id], 400, 1001, "2026-10-03T10:00:00.000Z"), // A (tim B) pobijedi
      mkFinishedGame("g4", [A.id, C.id], [B.id, D.id], 1001, 300, "2026-10-04T10:00:00.000Z"), // partneri, pobjeda
    ];
    // Nezavršena partija se ne broji.
    const unfinished = mkGame({ id: "g5", teamA: [A.id, B.id], teamB: [C.id, D.id], createdAt: "2026-10-05T10:00:00.000Z", finishedAt: null });
    const scored = getScoredGames(
      [...specs.map((s) => s.game), unfinished],
      specs.flatMap((s) => s.rounds),
    );

    const result = computeHeadToHead(A.id, C.id, scored);
    expect(result.opponents).toMatchObject({ games: 3, winsA: 2, winsB: 1 });
    expect(result.opponents.last5).toEqual(["W", "L", "W"]);
    expect(result.opponents.avgMargin).toBeCloseTo((401 - 501 + 601) / 3);
    expect(result.partners).toMatchObject({ games: 1, wins: 1, winRate: 1 });

    const mirrored = computeHeadToHead(C.id, A.id, scored);
    expect(mirrored.opponents).toMatchObject({ winsA: 1, winsB: 2 });
  });

  it("bez zajedničkih partija vraća nule", () => {
    const result = computeHeadToHead(A.id, B.id, []);
    expect(result.opponents.games).toBe(0);
    expect(result.partners.winRate).toBe(0);
  });
});
