import { describe, expect, it } from "vitest";
import type { Game } from "../lib/types";
import {
  computeRound,
  evaluateCallerSuccess,
  getGameScore,
  getWinningTeam,
} from "../lib/scoring";

const game: Game = {
  id: "00000000-0000-0000-0000-000000000100",
  dealerPlayerId: "00000000-0000-0000-0000-000000000001",
  createdAt: "2026-01-01T00:00:00.000Z",
  finishedAt: null,
  teams: {
    teamA: [
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002",
    ],
    teamB: [
      "00000000-0000-0000-0000-000000000003",
      "00000000-0000-0000-0000-000000000004",
    ],
  },
};

describe("scoring", () => {
  it("evaluates caller contract", () => {
    expect(evaluateCallerSuccess("A", 90, 72)).toBe(true);
    expect(evaluateCallerSuccess("B", 80, 82)).toBe(true);
    expect(evaluateCallerSuccess("A", 81, 81)).toBe(false);
    expect(evaluateCallerSuccess("B", 113, 99)).toBe(false);
  });

  it("writes zero points to caller on fall", () => {
    const computed = computeRound(game, {
      gameId: game.id,
      callerPlayerId: game.teams.teamA[0],
      calledSuit: "herc",
      pointsTeamA: 81,
      pointsTeamB: 81,
      zvanjaTeamA: 0,
      zvanjaTeamB: 20,
      zvanjaPlayerIdA: null,
      zvanjaPlayerIdB: game.teams.teamB[0],
      stigliaTeam: null,
    });

    expect(computed.callingTeam).toBe("A");
    expect(computed.callerSucceeded).toBe(false);
    expect(computed.pointsTeamA).toBe(0);
    expect(computed.pointsTeamB).toBe(182);
  });

  it("transfers all declarations to winner on fall", () => {
    const computed = computeRound(game, {
      gameId: game.id,
      callerPlayerId: game.teams.teamB[0],
      calledSuit: "pik",
      pointsTeamA: 103,
      pointsTeamB: 59,
      zvanjaTeamA: 0,
      zvanjaTeamB: 40,
      zvanjaPlayerIdA: null,
      zvanjaPlayerIdB: game.teams.teamB[0],
      stigliaTeam: null,
    });

    expect(computed.callingTeam).toBe("B");
    expect(computed.callerSucceeded).toBe(false);
    expect(computed.pointsTeamA).toBe(202);
    expect(computed.pointsTeamB).toBe(0);
  });

  it("aggregates game score", () => {
    const score = getGameScore([
      {
        id: "r1",
        gameId: game.id,
        roundNumber: 1,
        callerPlayerId: game.teams.teamA[0],
        calledSuit: "karo",
        callingTeam: "A",
        pointsTeamA: 100,
        pointsTeamB: 82,
        zvanjaTeamA: 20,
        zvanjaTeamB: 0,
        zvanjaPlayerIdA: game.teams.teamA[1],
        zvanjaPlayerIdB: null,
        stigliaTeam: null,
        callerSucceeded: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "r2",
        gameId: game.id,
        roundNumber: 2,
        callerPlayerId: game.teams.teamB[0],
        calledSuit: "pik",
        callingTeam: "B",
        pointsTeamA: 70,
        pointsTeamB: 120,
        zvanjaTeamA: 0,
        zvanjaTeamB: 40,
        zvanjaPlayerIdA: null,
        zvanjaPlayerIdB: game.teams.teamB[1],
        stigliaTeam: null,
        callerSucceeded: true,
        createdAt: "2026-01-01T00:10:00.000Z",
      },
    ]);

    expect(score).toEqual({ teamA: 170, teamB: 202 });
  });

  it("includes stiglia in totals when missing in stored round points", () => {
    const score = getGameScore([
      {
        id: "r3",
        gameId: game.id,
        roundNumber: 3,
        callerPlayerId: game.teams.teamA[0],
        calledSuit: "tref",
        callingTeam: "A",
        pointsTeamA: 162,
        pointsTeamB: 0,
        zvanjaTeamA: 0,
        zvanjaTeamB: 0,
        zvanjaPlayerIdA: null,
        zvanjaPlayerIdB: null,
        stigliaTeam: "A",
        callerSucceeded: true,
        createdAt: "2026-01-01T00:20:00.000Z",
      },
    ]);

    expect(score).toEqual({ teamA: 252, teamB: 0 });
  });

  it("picks winner when both teams pass 1000", () => {
    expect(getWinningTeam({ teamA: 1005, teamB: 1002 })).toBe("A");
    expect(getWinningTeam({ teamA: 998, teamB: 1001 })).toBe("B");
    expect(getWinningTeam({ teamA: 1001, teamB: 1001 })).toBe(null);
  });
});
