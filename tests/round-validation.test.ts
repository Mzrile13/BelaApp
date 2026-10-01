import { describe, expect, it } from "vitest";
import { validateRoundInput } from "../lib/roundValidation";
import type { RoundInput } from "../lib/types";
import { mkGame, mkPlayer } from "./factories";

const [a, b, c, d, outsider] = ["Ana", "Bruno", "Cvita", "Duje", "Tuđin"].map(mkPlayer);
const game = mkGame({
  id: "g1",
  teamA: [a.id, b.id],
  teamB: [c.id, d.id],
  createdAt: "2026-01-01T12:00:00.000Z",
  finishedAt: null,
});

function input(overrides: Partial<RoundInput> = {}): RoundInput {
  return {
    gameId: game.id,
    callerPlayerId: a.id,
    calledSuit: "herc",
    pointsTeamA: 100,
    pointsTeamB: 62,
    zvanjaTeamA: 20,
    zvanjaTeamB: 0,
    zvanjaPlayerIdA: a.id,
    zvanjaPlayerIdB: null,
    zvanjaByPlayerA: [
      { playerId: a.id, points: 20 },
      { playerId: b.id, points: 0 },
    ],
    zvanjaByPlayerB: [
      { playerId: c.id, points: 0 },
      { playerId: d.id, points: 0 },
    ],
    stigliaTeam: null,
    ...overrides,
  };
}

describe("validateRoundInput", () => {
  it("prihvaća ispravnu ruku", () => {
    expect(validateRoundInput(input(), game)).toBeNull();
  });

  it("traži da čista igra zbroji točno 162", () => {
    expect(validateRoundInput(input({ pointsTeamA: 0, pointsTeamB: 0 }), game)).toMatch(/162/);
    expect(validateRoundInput(input({ pointsTeamA: 100, pointsTeamB: 50 }), game)).toMatch(/162/);
  });

  it("odbija zvača koji ne igra u partiji", () => {
    expect(validateRoundInput(input({ callerPlayerId: outsider.id }), game)).toMatch(/Zvač/);
  });

  it("odbija igrača zvanja iz krivog tima", () => {
    expect(validateRoundInput(input({ zvanjaPlayerIdA: c.id }), game)).toMatch(/Tima A/);
    expect(
      validateRoundInput(
        input({ zvanjaByPlayerA: [{ playerId: c.id, points: 20 }] }),
        game,
      ),
    ).toMatch(/Tima A/);
  });

  it("traži da se zvanja po igračima zbroje u zvanje tima", () => {
    expect(
      validateRoundInput(input({ zvanjaByPlayerA: [{ playerId: a.id, points: 50 }] }), game),
    ).toMatch(/Zbroj zvanja/);
  });

  it("štiglja samo uz svih 162 boda", () => {
    expect(validateRoundInput(input({ stigliaTeam: "A" }), game)).toMatch(/Štiglja/);
    expect(
      validateRoundInput(input({ stigliaTeam: "A", pointsTeamA: 162, pointsTeamB: 0 }), game),
    ).toBeNull();
  });
});
