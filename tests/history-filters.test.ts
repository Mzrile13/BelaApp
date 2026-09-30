import { describe, expect, it, vi } from "vitest";
import { mkGame, mkPlayer, mkRound } from "./factories";

const [ana, bob, cec, dan] = [
  mkPlayer("Ana", 1),
  mkPlayer("Bob", 2),
  mkPlayer("Cec", 3),
  mkPlayer("Dan", 4),
];

// g1: Ana+Bob (A) pobjeđuju Cec+Dan, 10.1.
// g2: Ana+Cec (A) gube od Bob+Dan, 20.1.
// g3: nezavršena partija, ne smije se pojaviti.
const games = [
  mkGame({ id: "g2", teamA: [ana.id, cec.id], teamB: [bob.id, dan.id], createdAt: "2026-01-20T12:00:00.000Z" }),
  mkGame({ id: "g1", teamA: [ana.id, bob.id], teamB: [cec.id, dan.id], createdAt: "2026-01-10T12:00:00.000Z" }),
  mkGame({ id: "g3", teamA: [ana.id, bob.id], teamB: [cec.id, dan.id], createdAt: "2026-01-25T12:00:00.000Z", finishedAt: null }),
];
const rounds = [
  mkRound({ gameId: "g1", roundNumber: 1, callerPlayerId: ana.id, callingTeam: "A", pointsTeamA: 100, pointsTeamB: 62 }),
  mkRound({ gameId: "g2", roundNumber: 1, callerPlayerId: bob.id, callingTeam: "B", pointsTeamA: 62, pointsTeamB: 100 }),
  mkRound({ gameId: "g3", roundNumber: 1, callerPlayerId: ana.id, callingTeam: "A", pointsTeamA: 100, pointsTeamB: 62 }),
];

vi.mock("@/lib/cachedStats", () => ({
  getCachedDataset: async () => ({ players: [ana, bob, cec, dan], games, rounds }),
}));
vi.mock("@/lib/supabase", () => ({
  getRepo: () => ({
    listGameComments: async () => ({ g1: "Odlična štiglja", g2: "Revanš je bio tijesan" }),
  }),
}));

const { getHistoryPage, getHistoryFilterOptions, parseHistoryFilters, pairKeyOf } = await import("../lib/history");

const ids = async (filters: Parameters<typeof getHistoryPage>[1]) =>
  (await getHistoryPage("acc", filters, 0, 20)).rows.map((row) => row.id);

describe("filtrirana povijest", () => {
  it("izostavlja nezavršene partije i prikazuje komentar", async () => {
    const { rows } = await getHistoryPage("acc", { playerId: ana.id }, 0, 20);
    expect(rows.map((row) => row.id)).toEqual(["g2", "g1"]);
    expect(rows[1].comment).toBe("Odlična štiglja");
  });

  it("filtrira po rasponu datuma (uključivo)", async () => {
    expect(await ids({ from: "2026-01-15" })).toEqual(["g2"]);
    expect(await ids({ to: "2026-01-10" })).toEqual(["g1"]);
    expect(await ids({ from: "2026-01-10", to: "2026-01-20" })).toEqual(["g2", "g1"]);
  });

  it("pobjeda/poraz je iz perspektive igrača", async () => {
    expect(await ids({ playerId: ana.id, result: "win" })).toEqual(["g1"]);
    expect(await ids({ playerId: ana.id, result: "loss" })).toEqual(["g2"]);
    expect(await ids({ playerId: dan.id, result: "win" })).toEqual(["g2"]);
  });

  it("filtrira po paru i pobjedi para", async () => {
    const pair = pairKeyOf(bob.id, ana.id);
    expect(await ids({ pair })).toEqual(["g1"]);
    expect(await ids({ pair, result: "loss" })).toEqual([]);
    expect(await ids({ pair: pairKeyOf(bob.id, dan.id), result: "win" })).toEqual(["g2"]);
  });

  it("pretražuje komentare bez razlikovanja velikih/malih slova", async () => {
    expect(await ids({ q: "ŠTIGLJA".toLowerCase() })).toEqual(["g1"]);
    expect(await ids({ q: "REVANŠ" })).toEqual(["g2"]);
    expect(await ids({ q: "nema" })).toEqual([]);
  });

  it("straniči nad filtriranim rezultatom", async () => {
    const page = await getHistoryPage("acc", { playerId: ana.id }, 0, 1);
    expect(page.rows.map((row) => row.id)).toEqual(["g2"]);
    expect(page.hasMore).toBe(true);
  });

  it("opcije: parovi samo iz završenih partija, po igraču", async () => {
    const all = await getHistoryFilterOptions("acc");
    expect(all.pairs).toHaveLength(4);
    const forCec = await getHistoryFilterOptions("acc", cec.id);
    expect(forCec.pairs.map((pair) => pair.label)).toEqual(["Ana + Cec", "Cec + Dan"]);
  });

  it("odbacuje neispravne parametre", () => {
    const filters = parseHistoryFilters(
      new URLSearchParams({ from: "x", playerId: "nije-uuid", pair: "a:b", result: "draw", q: "  " }),
    );
    expect(filters).toEqual({});
  });
});
