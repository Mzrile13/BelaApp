import { describe, expect, it } from "vitest";
import { computePairStats, computePlayerStats } from "../lib/stats";
import type { Game, Player, Round } from "../lib/types";

const players: Player[] = [
  { id: "00000000-0000-0000-0000-000000000001", username: "marko", createdAt: "2026-01-01" },
  { id: "00000000-0000-0000-0000-000000000002", username: "ana", createdAt: "2026-01-01" },
  { id: "00000000-0000-0000-0000-000000000003", username: "ivan", createdAt: "2026-01-01" },
  { id: "00000000-0000-0000-0000-000000000004", username: "tea", createdAt: "2026-01-01" },
];

const games: Game[] = [
  {
    id: "00000000-0000-0000-0000-000000000100",
    dealerPlayerId: players[0].id,
    createdAt: "2026-01-01",
    finishedAt: "2026-01-01T01:00:00.000Z",
    teams: {
      teamA: [players[0].id, players[1].id],
      teamB: [players[2].id, players[3].id],
    },
  },
];

const rounds: Round[] = [
  {
    id: "r1",
    gameId: games[0].id,
    roundNumber: 1,
    callerPlayerId: players[0].id,
    calledSuit: "herc",
    callingTeam: "A",
    pointsTeamA: 120,
    pointsTeamB: 60,
    zvanjaTeamA: 20,
    zvanjaTeamB: 0,
    zvanjaPlayerIdA: players[1].id,
    zvanjaPlayerIdB: null,
    stigliaTeam: "A",
    callerSucceeded: true,
    createdAt: "2026-01-01",
  },
  {
    id: "r2",
    gameId: games[0].id,
    roundNumber: 2,
    callerPlayerId: players[2].id,
    calledSuit: "pik",
    callingTeam: "B",
    pointsTeamA: 90,
    pointsTeamB: 80,
    zvanjaTeamA: 0,
    zvanjaTeamB: 0,
    zvanjaPlayerIdA: null,
    zvanjaPlayerIdB: null,
    stigliaTeam: null,
    callerSucceeded: false,
    createdAt: "2026-01-01",
  },
];

describe("stats", () => {
  it("computes player stats with advanced metrics", () => {
    const stats = computePlayerStats(players, games, rounds);
    expect(stats.length).toBe(4);
    expect(stats[0].mvpScore).toBeGreaterThanOrEqual(0);
    expect(stats[0].trend).toMatch(/hot|steady|cold/);
    const ana = stats.find((row) => row.username === "ana");
    expect(ana?.zvanjaTotal).toBe(20);
    expect(ana?.stigliaCount).toBe(1);
  });

  it("computes pair stats", () => {
    const pairs = computePairStats(players, games, rounds);
    expect(pairs.length).toBe(2);
    expect(pairs[0].gamesTogether).toBe(1);
  });
});
