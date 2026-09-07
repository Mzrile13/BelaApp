import { describe, expect, it } from "vitest";
import { computeAllStats, computePairStats, computePlayerStats } from "../lib/stats";
import { getDealerForRound } from "../lib/dealer";
import { mkGame, mkPlayer, mkRound, repeatGames } from "./factories";
import type { Game, Round, TeamId } from "../lib/types";

const [p1, p2, p3, p4] = ["marko", "ana", "ivan", "tea"].map((name, index) =>
  mkPlayer(name, index + 1),
);
const players = [p1, p2, p3, p4];

/** Partija s više rundi; svaka runda je [bodoviA, bodoviB, tkoJeZvao]. */
function multiRoundGame(
  id: string,
  createdAt: string,
  rounds: Array<[number, number, string]>,
): { game: Game; rounds: Round[] } {
  const game = mkGame({
    id,
    teamA: [p1.id, p2.id],
    teamB: [p3.id, p4.id],
    createdAt,
    dealerPlayerId: p1.id,
  });
  return {
    game,
    rounds: rounds.map(([pointsTeamA, pointsTeamB, callerPlayerId], index) =>
      mkRound({
        gameId: id,
        roundNumber: index + 1,
        callerPlayerId,
        callingTeam: (game.teams.teamA.includes(callerPlayerId) ? "A" : "B") as TeamId,
        pointsTeamA,
        pointsTeamB,
      }),
    ),
  };
}

describe("stats — zvanje aduta", () => {
  it("prepoznaje zvanje na mus po djelitelju te ruke", () => {
    // Rotacija djelitelja je [teamA0, teamB0, teamA1, teamB1], pa 1. ruku dijeli
    // p1 (zvao je => na mus), a 2. ruku p3 (p1 je zvao dobrovoljno).
    const built = multiRoundGame("g1", "2026-01-01T12:00:00.000Z", [
      [100, 62, p1.id],
      [100, 62, p1.id],
    ]);
    expect(getDealerForRound(built.game, 1)).toBe(p1.id);
    expect(getDealerForRound(built.game, 2)).toBe(p3.id);

    const stats = computePlayerStats(players, [built.game], built.rounds);
    const marko = stats.find((row) => row.playerId === p1.id);

    expect(marko?.timesCalled).toBe(2);
    expect(marko?.forcedCalls).toBe(1);
    expect(marko?.voluntaryCalls).toBe(1);
    // Prilika za dobrovoljno zvanje je samo ruka koju nije dijelio.
    expect(marko?.voluntaryCallRate).toBe(1);
  });

  it("Call Value Added mjeri zvanje protiv ligaškog prosjeka, ne protiv nule", () => {
    // Svi zovu dobrovoljno i svi postižu isto — nitko nema prednost.
    const flat = repeatGames(8, (i) => ({
      teamA: [p1.id, p2.id] as [string, string],
      teamB: [p3.id, p4.id] as [string, string],
      scoreA: i % 2 === 0 ? 1001 : 500,
      scoreB: i % 2 === 0 ? 500 : 1001,
    }));

    // Jedna partija u kojoj p2 zove i odnosi sve ruke.
    const standout = multiRoundGame("standout", "2026-06-01T12:00:00.000Z", [
      [162, 0, p2.id],
      [162, 0, p2.id],
      [162, 0, p2.id],
    ]);

    const stats = computePlayerStats(
      players,
      [...flat.games, standout.game],
      [...flat.rounds, ...standout.rounds],
    );
    const ana = stats.find((row) => row.playerId === p2.id);
    const ivan = stats.find((row) => row.playerId === p3.id);

    expect(ana?.callValueAddedPerCall ?? 0).toBeGreaterThan(0);
    expect(ana?.callValueAddedPerCall ?? 0).toBeGreaterThan(ivan?.callValueAddedPerCall ?? 0);
  });
});

describe("stats — kronologija", () => {
  it("'zadnjih 5 ruku' su stvarno zadnje odigrane, a ne rep najduže partije", () => {
    // Stara verzija je sortirala runde svih partija samo po rednom broju runde,
    // pa je "forma" bila rep najdulje partije umjesto zadnjih odigranih ruku.
    const older = multiRoundGame(
      "older",
      "2026-01-01T12:00:00.000Z",
      Array.from({ length: 8 }, () => [20, 142, p3.id] as [number, number, string]),
    );
    const newer = multiRoundGame(
      "newer",
      "2026-09-01T12:00:00.000Z",
      Array.from({ length: 5 }, () => [150, 12, p1.id] as [number, number, string]),
    );

    const stats = computePlayerStats(
      players,
      [older.game, newer.game],
      [...older.rounds, ...newer.rounds],
    );
    const marko = stats.find((row) => row.playerId === p1.id);

    expect(marko?.roundsPlayed).toBe(13);
    expect(marko?.avgLast5).toBe(150);
  });

  it("preokret se traži unutar partije, ne preko granica partija", () => {
    const first = multiRoundGame("first", "2026-02-01T12:00:00.000Z", [
      [0, 300, p3.id],
      [200, 100, p1.id],
    ]);
    const second = multiRoundGame("second", "2026-03-01T12:00:00.000Z", [
      [250, 0, p1.id],
    ]);

    const stats = computePlayerStats(
      players,
      [first.game, second.game],
      [...first.rounds, ...second.rounds],
    );
    const marko = stats.find((row) => row.playerId === p1.id);

    // Unutar 1. partije najveći uspon je +100, unutar 2. je +250.
    // Spojene partije dale bi lažnih +350.
    expect(marko?.biggestComeback).toBe(250);
  });
});

describe("stats — završnica", () => {
  it("clutch broji samo ruke odigrane u završnici partije", () => {
    const built = multiRoundGame("clutch", "2026-04-01T12:00:00.000Z", [
      [400, 350, p1.id], // prije: 0:0 — daleko od cilja
      [400, 350, p1.id], // prije: 400:350 — još daleko
      [200, 50, p1.id], // prije: 800:700 — završnica, tijesno
      [100, 50, p1.id], // prije: 1000:750 — razlika prevelika
    ]);

    const stats = computePlayerStats(players, [built.game], built.rounds);
    const marko = stats.find((row) => row.playerId === p1.id);
    const ivan = stats.find((row) => row.playerId === p3.id);

    expect(marko?.clutchRounds).toBe(1);
    expect(marko?.clutchIndex).toBe(1);
    expect(ivan?.clutchRounds).toBe(1);
    expect(ivan?.clutchIndex).toBe(0);
  });
});

describe("stats — parovi", () => {
  it("kemija je odmak od očekivanog i stisnuta je prema nuli na malom uzorku", () => {
    const { games, rounds } = repeatGames(10, (i) => ({
      teamA: [p1.id, p2.id] as [string, string],
      teamB: [p3.id, p4.id] as [string, string],
      scoreA: i % 10 < 8 ? 1001 : 500,
      scoreB: i % 10 < 8 ? 500 : 1001,
    }));

    const pairs = computePairStats(players, games, rounds);
    for (const pair of pairs) {
      expect(pair.chemistryRaw).toBeCloseTo(pair.winRate - pair.expectedWinRate, 2);
      // Stiskanje nikad ne mijenja predznak i uvijek smanjuje iznos.
      expect(Math.abs(pair.chemistry)).toBeLessThanOrEqual(Math.abs(pair.chemistryRaw) + 1e-9);
      expect(pair.confidence).toBeGreaterThan(0);
      expect(pair.confidence).toBeLessThan(1);
    }
  });

  it("par koji nadmašuje svoje rejtinge ima pozitivnu kemiju", () => {
    // p1+p2 dobivaju 8/10 protiv p3+p4, ali u drugim kombinacijama su izjednačeni,
    // pa im pojedinačni rejtinzi ne predviđaju toliku dominaciju baš u tom paru.
    const together = repeatGames(20, (i) => ({
      teamA: [p1.id, p2.id] as [string, string],
      teamB: [p3.id, p4.id] as [string, string],
      scoreA: i % 10 < 8 ? 1001 : 500,
      scoreB: i % 10 < 8 ? 500 : 1001,
    }));
    const mixed = repeatGames(
      20,
      (i) => ({
        teamA: [p1.id, p3.id] as [string, string],
        teamB: [p2.id, p4.id] as [string, string],
        scoreA: i % 2 === 0 ? 1001 : 500,
        scoreB: i % 2 === 0 ? 500 : 1001,
      }),
      100,
    );

    const pairs = computePairStats(
      players,
      [...together.games, ...mixed.games],
      [...together.rounds, ...mixed.rounds],
    );
    const duo = pairs.find(
      (row) =>
        [row.playerAId, row.playerBId].includes(p1.id) &&
        [row.playerAId, row.playerBId].includes(p2.id),
    );

    expect(duo?.gamesTogether).toBe(20);
    expect(duo?.chemistry ?? 0).toBeGreaterThan(0);
    expect(pairs[0].chemistry).toBeGreaterThanOrEqual(pairs[pairs.length - 1].chemistry);
  });
});

describe("stats — prag za poredak", () => {
  const build = (count: number) =>
    repeatGames(count, (i) => ({
      teamA: [p1.id, p2.id] as [string, string],
      teamB: [p3.id, p4.id] as [string, string],
      scoreA: i % 2 === 0 ? 1001 : 500,
      scoreB: i % 2 === 0 ? 500 : 1001,
    }));

  it("igrač ulazi u poredak na 15 partija, par na 10", () => {
    const nine = build(9);
    const ten = build(10);
    const fifteen = build(15);

    const at9 = computeAllStats(players, nine.games, nine.rounds);
    const at10 = computeAllStats(players, ten.games, ten.rounds);
    const at15 = computeAllStats(players, fifteen.games, fifteen.rounds);

    expect(at9.players.every((row) => row.provisional)).toBe(true);
    expect(at9.pairs.every((row) => row.provisional)).toBe(true);

    // Par se kvalificira ranije od igrača — pragovi su neovisni.
    expect(at10.players.every((row) => row.provisional)).toBe(true);
    expect(at10.pairs.every((row) => row.provisional)).toBe(false);

    expect(at15.players.every((row) => row.provisional)).toBe(false);
    expect(at15.pairs.every((row) => row.provisional)).toBe(false);
  });
});

describe("stats — osnovno", () => {
  const built = multiRoundGame("basic", "2026-01-01T12:00:00.000Z", [
    [120, 60, p1.id],
    [90, 80, p3.id],
  ]);
  const withZvanja: Round[] = [
    {
      ...built.rounds[0],
      zvanjaTeamA: 20,
      zvanjaPlayerIdA: p2.id,
      stigliaTeam: "A" as TeamId,
    },
    built.rounds[1],
  ];

  it("pripisuje zvanja i štiglju pravom igraču", () => {
    const stats = computePlayerStats(players, [built.game], withZvanja);
    const ana = stats.find((row) => row.username === "ana");
    expect(ana?.zvanjaTotal).toBe(20);
    expect(ana?.stigliaCount).toBe(1);
  });

  it("računa igrače i parove u jednom prolazu i sortira ih smisleno", () => {
    const all = computeAllStats(players, [built.game], withZvanja);
    expect(all.players).toHaveLength(4);
    expect(all.pairs).toHaveLength(2);
    expect(all.rating.scoredGames).toHaveLength(1);
    // Igrači su poredani po konzervativnom rejtingu, padajuće.
    for (let i = 1; i < all.players.length; i += 1) {
      expect(all.players[i - 1].conservativeRating).toBeGreaterThanOrEqual(
        all.players[i].conservativeRating,
      );
    }
  });

  it("nezavršene partije ne ulaze ni u jednu statistiku", () => {
    const open = { ...built.game, finishedAt: null };
    const stats = computePlayerStats(players, [open], built.rounds);
    expect(stats.every((row) => row.gamesPlayed === 0)).toBe(true);
    expect(stats.every((row) => row.roundsPlayed === 0)).toBe(true);
  });
});
