import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryRepo, createMemoryStore } from "../lib/supabase";
import type { MemoryStore } from "../lib/supabase";
import type { RoundInput } from "../lib/types";

// Izolacija između računa (grupa prijatelja) provodi se u aplikacijskom kodu —
// RLS je uključen bez politika i sve ide preko service-role ključa. Ovi testovi
// vrte istu logiku scopeanja nad dijeljenim in-memory storeom.

const ACCOUNT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ACCOUNT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

let store: MemoryStore;
let a: ReturnType<typeof createMemoryRepo>;
let b: ReturnType<typeof createMemoryRepo>;

function roundInput(gameId: string, callerPlayerId: string): RoundInput {
  return {
    gameId,
    callerPlayerId,
    calledSuit: "herc",
    pointsTeamA: 100,
    pointsTeamB: 62,
    zvanjaTeamA: 0,
    zvanjaTeamB: 0,
    zvanjaPlayerIdA: null,
    zvanjaPlayerIdB: null,
    stigliaTeam: null,
  };
}

/** Napravi grupu s 4 igrača i jednu partiju s jednom odigranom rukom. */
async function seed(repo: ReturnType<typeof createMemoryRepo>, prefix: string) {
  const group = await repo.createGroup(`${prefix}-drustvo`);
  const players = [];
  for (const name of ["marko", "ana", "ivan", "tea"]) {
    const player = await repo.createPlayer(name);
    await repo.addPlayerToGroup(group.id, player.id);
    players.push(player);
  }
  const game = await repo.createGame({
    groupId: group.id,
    dealerPlayerId: players[0]!.id,
    teamA: [players[0]!.id, players[1]!.id],
    teamB: [players[2]!.id, players[3]!.id],
  });
  const round = await repo.createRound(roundInput(game.id, players[0]!.id));
  return { group, players, game, round };
}

beforeEach(() => {
  store = createMemoryStore();
  a = createMemoryRepo(ACCOUNT_A, store);
  b = createMemoryRepo(ACCOUNT_B, store);
});

describe("čitanje je ograničeno na vlastiti račun", () => {
  it("svaki račun vidi samo svoje igrače, partije i ruke", async () => {
    const seedA = await seed(a, "a");
    await seed(b, "b");

    expect(await a.listPlayers()).toHaveLength(4);
    expect(await a.listGames()).toHaveLength(1);
    expect((await a.listGames())[0]!.id).toBe(seedA.game.id);
    expect(await a.listGroups()).toHaveLength(1);
    expect((await a.listGroups())[0]!.name).toBe("a-drustvo");

    expect(await b.listGames()).toHaveLength(1);
    expect((await b.listGames())[0]!.id).not.toBe(seedA.game.id);

    // Store stvarno drži oba računa — filtriranje je ono što ih razdvaja.
    expect(store.players).toHaveLength(8);
    expect(store.games).toHaveLength(2);
  });

  it("getGame na tuđem id-u vraća null", async () => {
    const seedA = await seed(a, "a");
    expect(await b.getGame(seedA.game.id)).toBeNull();
    expect(await a.getGame(seedA.game.id)).not.toBeNull();
  });

  it("listRounds i listRoundsForGames ne propuštaju tuđe ruke", async () => {
    const seedA = await seed(a, "a");
    expect(await b.listRounds(seedA.game.id)).toEqual([]);
    expect(await b.listRoundsForGames([seedA.game.id])).toEqual([]);
    expect(await a.listRoundsForGames([seedA.game.id])).toHaveLength(1);
  });

  it("listGroupPlayers na tuđoj grupi vraća prazno", async () => {
    const seedA = await seed(a, "a");
    expect(await b.listGroupPlayers(seedA.group.id)).toEqual([]);
    expect(await a.listGroupPlayers(seedA.group.id)).toHaveLength(4);
  });

  it("listAllGroupMembers ne sadrži tuđe grupe", async () => {
    const seedA = await seed(a, "a");
    expect(Object.keys(await b.listAllGroupMembers())).not.toContain(seedA.group.id);
  });

  it("povijest završenih partija je po računu", async () => {
    const seedA = await seed(a, "a");
    await a.finishGame(seedA.game.id);
    expect((await a.listFinishedGamesPage(20, 0)).games).toHaveLength(1);
    expect((await b.listFinishedGamesPage(20, 0)).games).toHaveLength(0);
  });
});

describe("pisanje po tuđem id-u ne prolazi", () => {
  it("deleteGame na tuđoj partiji ne briše ništa", async () => {
    const seedA = await seed(a, "a");
    await b.deleteGame(seedA.game.id);
    expect(await a.getGame(seedA.game.id)).not.toBeNull();
    expect(store.rounds).toHaveLength(1);
  });

  it("finishGame i reopenGame na tuđoj partiji ne rade ništa", async () => {
    const seedA = await seed(a, "a");
    await b.finishGame(seedA.game.id);
    expect((await a.getGame(seedA.game.id))!.finishedAt).toBeNull();

    await a.finishGame(seedA.game.id);
    await b.reopenGame(seedA.game.id);
    expect((await a.getGame(seedA.game.id))!.finishedAt).not.toBeNull();
  });

  it("updateRound na tuđoj ruci baca umjesto da piše", async () => {
    const seedA = await seed(a, "a");
    await expect(
      b.updateRound(seedA.round.id, roundInput(seedA.game.id, seedA.players[0]!.id)),
    ).rejects.toThrow();
  });

  it("deleteGroup i renameGroup na tuđoj grupi ne rade ništa", async () => {
    const seedA = await seed(a, "a");
    await b.deleteGroup(seedA.group.id);
    expect(await a.listGroups()).toHaveLength(1);
    await expect(b.renameGroup(seedA.group.id, "oteto")).rejects.toThrow();
    expect((await a.listGroups())[0]!.name).toBe("a-drustvo");
  });

  it("tuđi igrač se ne može ubaciti u vlastitu grupu", async () => {
    const seedA = await seed(a, "a");
    const groupB = await b.createGroup("b-drustvo");
    await expect(b.addPlayerToGroup(groupB.id, seedA.players[0]!.id)).rejects.toThrow();
    expect(await b.listGroupPlayers(groupB.id)).toEqual([]);
  });

  it("vlastiti igrač se ne može ubaciti u tuđu grupu", async () => {
    const seedA = await seed(a, "a");
    const playerB = await b.createPlayer("borna");
    await expect(b.addPlayerToGroup(seedA.group.id, playerB.id)).rejects.toThrow();
    expect(await a.listGroupPlayers(seedA.group.id)).toHaveLength(4);
  });

  it("removePlayerFromGroup ne dira tuđe članstvo", async () => {
    const seedA = await seed(a, "a");
    await b.removePlayerFromGroup(seedA.group.id, seedA.players[0]!.id);
    expect(await a.listGroupPlayers(seedA.group.id)).toHaveLength(4);
  });

  it("ruka se ne može premjestiti u tuđu partiju", async () => {
    const seedA = await seed(a, "a");
    const seedB = await seed(b, "b");
    await expect(
      a.updateRound(seedA.round.id, roundInput(seedB.game.id, seedA.players[0]!.id)),
    ).rejects.toThrow();
  });
});

describe("imena su jedinstvena po računu, ne globalno", () => {
  it("dvije grupe smiju imati igrača istog imena", async () => {
    const markoA = await a.createPlayer("marko");
    const markoB = await b.createPlayer("marko");
    expect(markoA.id).not.toBe(markoB.id);
    expect(await a.listPlayers()).toHaveLength(1);
    expect(await b.listPlayers()).toHaveLength(1);
  });

  it("dvije grupe smiju imati društvo istog naziva", async () => {
    const groupA = await a.createGroup("cetvrtak");
    const groupB = await b.createGroup("cetvrtak");
    expect(groupA.id).not.toBe(groupB.id);
  });
});
