import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import type {
  CalledSuit,
  Game,
  NewGameInput,
  Player,
  PlayerGroup,
  PlayerZvanja,
  Round,
  RoundInput,
} from "@/lib/types";
import { computeRound } from "@/lib/scoring";

type Nullable<T> = T | null;

interface BelaRepository {
  listPlayers(): Promise<Player[]>;
  createPlayer(username: string): Promise<Player>;
  listGroups(): Promise<PlayerGroup[]>;
  createGroup(name: string): Promise<PlayerGroup>;
  renameGroup(groupId: string, name: string): Promise<PlayerGroup>;
  deleteGroup(groupId: string): Promise<void>;
  listGroupPlayers(groupId: string): Promise<Player[]>;
  listAllGroupMembers(): Promise<Record<string, Player[]>>;
  addPlayerToGroup(groupId: string, playerId: string): Promise<void>;
  removePlayerFromGroup(groupId: string, playerId: string): Promise<void>;
  listGames(): Promise<Game[]>;
  listFinishedGamesPage(limit: number, offset: number): Promise<{ games: Game[]; hasMore: boolean }>;
  getGame(id: string): Promise<Nullable<Game>>;
  createGame(input: NewGameInput): Promise<Game>;
  deleteGame(gameId: string): Promise<void>;
  finishGame(gameId: string): Promise<void>;
  reopenGame(gameId: string): Promise<void>;
  listRounds(gameId: string): Promise<Round[]>;
  listRoundsForGames(gameIds: string[]): Promise<Round[]>;
  createRound(input: RoundInput): Promise<Round>;
  updateRound(roundId: string, input: RoundInput): Promise<Round>;
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Račun u koji migracija 008 seli sve zatečene podatke. Lokalni fallback koristi
 * isti id da dev baza zatečena bez `accountId` ostane vidljiva.
 */
export const LEGACY_ACCOUNT_ID = "00000000-0000-0000-0000-000000000001";

/** Redak kakav se sprema lokalno — javni tipovi ne nose `accountId`. */
type Owned<T> = T & { accountId: string };

export interface MemoryStore {
  players: Owned<Player>[];
  groups: Owned<PlayerGroup>[];
  groupPlayers: Array<{ groupId: string; playerId: string; accountId: string }>;
  games: Owned<Game>[];
  rounds: Owned<Round>[];
}

export function createMemoryStore(): MemoryStore {
  return { players: [], groups: [], groupPlayers: [], games: [], rounds: [] };
}

class InMemoryRepo implements BelaRepository {
  constructor(
    private readonly accountId: string,
    private readonly store: MemoryStore,
  ) {}

  private get players() {
    return this.store.players.filter((row) => row.accountId === this.accountId);
  }
  private get groups() {
    return this.store.groups.filter((row) => row.accountId === this.accountId);
  }
  private get groupPlayers() {
    return this.store.groupPlayers.filter((row) => row.accountId === this.accountId);
  }
  private get games() {
    return this.store.games.filter((row) => row.accountId === this.accountId);
  }
  private get rounds() {
    return this.store.rounds.filter((row) => row.accountId === this.accountId);
  }

  async listPlayers() {
    return [...this.players].sort((a, b) => a.username.localeCompare(b.username));
  }

  async createPlayer(username: string) {
    const exists = this.players.find(
      (player) => player.username.toLowerCase() === username.toLowerCase(),
    );
    if (exists) return exists;

    const player: Owned<Player> = {
      id: crypto.randomUUID(),
      username,
      createdAt: nowIso(),
      accountId: this.accountId,
    };
    this.store.players.push(player);
    return player;
  }

  async listGroups() {
    return [...this.groups].sort((a, b) => a.name.localeCompare(b.name));
  }

  async createGroup(name: string) {
    const existing = this.groups.find(
      (group) => group.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) return existing;
    const group: Owned<PlayerGroup> = {
      id: crypto.randomUUID(),
      name,
      createdAt: nowIso(),
      accountId: this.accountId,
    };
    this.store.groups.push(group);
    return group;
  }

  async renameGroup(groupId: string, name: string) {
    const group = this.groups.find((row) => row.id === groupId);
    if (!group) {
      throw new Error("Grupa nije pronađena");
    }
    group.name = name;
    return group;
  }

  async deleteGroup(groupId: string) {
    if (!this.groups.some((row) => row.id === groupId)) return;
    this.store.groupPlayers = this.store.groupPlayers.filter(
      (row) => row.groupId !== groupId,
    );
    this.store.groups = this.store.groups.filter((row) => row.id !== groupId);
  }

  async listGroupPlayers(groupId: string) {
    if (!this.groups.some((row) => row.id === groupId)) return [];
    const memberIds = this.groupPlayers
      .filter((row) => row.groupId === groupId)
      .map((row) => row.playerId);
    return this.players
      .filter((player) => memberIds.includes(player.id))
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async listAllGroupMembers() {
    const playersById = new Map(this.players.map((player) => [player.id, player]));
    const map: Record<string, Player[]> = {};
    for (const row of this.groupPlayers) {
      const player = playersById.get(row.playerId);
      if (!player) continue;
      (map[row.groupId] ??= []).push(player);
    }
    for (const members of Object.values(map)) {
      members.sort((a, b) => a.username.localeCompare(b.username));
    }
    return map;
  }

  async addPlayerToGroup(groupId: string, playerId: string) {
    const group = this.groups.find((row) => row.id === groupId);
    if (!group) throw new Error("Grupa nije pronađena");
    const player = this.players.find((row) => row.id === playerId);
    if (!player) throw new Error("Igrač nije pronađen");
    const exists = this.store.groupPlayers.some(
      (row) => row.groupId === groupId && row.playerId === playerId,
    );
    if (!exists) {
      this.store.groupPlayers.push({ groupId, playerId, accountId: this.accountId });
    }
  }

  async removePlayerFromGroup(groupId: string, playerId: string) {
    const index = this.store.groupPlayers.findIndex(
      (row) =>
        row.groupId === groupId &&
        row.playerId === playerId &&
        row.accountId === this.accountId,
    );
    if (index >= 0) {
      this.store.groupPlayers.splice(index, 1);
    }
  }

  async listGames() {
    return [...this.games].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listFinishedGamesPage(limit: number, offset: number) {
    const finished = this.games
      .filter((game) => game.finishedAt !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const games = finished.slice(offset, offset + limit);
    return { games, hasMore: offset + limit < finished.length };
  }

  async getGame(id: string) {
    return this.games.find((game) => game.id === id) ?? null;
  }

  async createGame(input: NewGameInput) {
    const game: Owned<Game> = {
      id: crypto.randomUUID(),
      dealerPlayerId: input.dealerPlayerId,
      createdAt: nowIso(),
      finishedAt: null,
      teams: { teamA: input.teamA, teamB: input.teamB },
      accountId: this.accountId,
    };
    this.store.games.push(game);
    return game;
  }

  async deleteGame(gameId: string) {
    if (!this.games.some((game) => game.id === gameId)) return;
    this.store.rounds = this.store.rounds.filter((round) => round.gameId !== gameId);
    this.store.games = this.store.games.filter((game) => game.id !== gameId);
  }

  async finishGame(gameId: string) {
    const game = this.games.find((row) => row.id === gameId);
    if (!game || game.finishedAt) return;
    game.finishedAt = nowIso();
  }

  async reopenGame(gameId: string) {
    const game = this.games.find((row) => row.id === gameId);
    if (!game) return;
    game.finishedAt = null;
  }

  async listRounds(gameId: string) {
    return this.rounds
      .filter((round) => round.gameId === gameId)
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }

  async listRoundsForGames(gameIds: string[]) {
    const gameIdSet = new Set(gameIds);
    return this.rounds
      .filter((round) => gameIdSet.has(round.gameId))
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }

  async createRound(input: RoundInput) {
    const game = await this.getGame(input.gameId);
    if (!game) {
      throw new Error("Partija nije pronađena");
    }
    const computed = computeRound(game, input);
    const currentRounds = await this.listRounds(input.gameId);

    const row: Owned<Round> = {
      id: crypto.randomUUID(),
      roundNumber: currentRounds.length + 1,
      createdAt: nowIso(),
      ...computed,
      accountId: this.accountId,
    };
    this.store.rounds.push(row);
    return row;
  }

  async updateRound(roundId: string, input: RoundInput) {
    const game = await this.getGame(input.gameId);
    if (!game) {
      throw new Error("Partija nije pronađena");
    }
    const existing = this.rounds.find((round) => round.id === roundId);
    if (!existing) {
      throw new Error("Ruka nije pronađena");
    }
    if (existing.gameId !== input.gameId) {
      throw new Error("Ruka ne pripada partiji");
    }
    const computed = computeRound(game, input);
    Object.assign(existing, computed, {
      calledSuit: input.calledSuit,
      stigliaTeam: input.stigliaTeam,
    });
    return existing;
  }
}

/** Repozitorij nad dijeljenim in-memory storeom — koriste ga testovi. */
export function createMemoryRepo(accountId: string, store: MemoryStore): BelaRepository {
  return new InMemoryRepo(accountId, store);
}

interface LocalDb {
  players: Owned<Player>[];
  groups: Owned<PlayerGroup>[];
  groupPlayers: Array<{ groupId: string; playerId: string; accountId: string }>;
  games: Owned<Game>[];
  rounds: Owned<Round>[];
}

const allowedSuits: CalledSuit[] = ["karo", "herc", "pik", "tref"];

class FileRepo implements BelaRepository {
  private readonly dbPath = path.join(process.cwd(), ".data", "bela-db.json");

  constructor(private readonly accountId: string) {}

  private normalizeRound(round: Owned<Round>): Owned<Round> {
    const calledSuit =
      typeof (round as Partial<Round>).calledSuit === "string" &&
      allowedSuits.includes((round as Partial<Round>).calledSuit as CalledSuit)
        ? ((round as Partial<Round>).calledSuit as CalledSuit)
        : null;

    const zvanjaByPlayerA: PlayerZvanja[] =
      round.zvanjaByPlayerA && round.zvanjaByPlayerA.length > 0
        ? round.zvanjaByPlayerA
        : round.zvanjaPlayerIdA && round.zvanjaTeamA > 0
          ? [{ playerId: round.zvanjaPlayerIdA, points: round.zvanjaTeamA }]
          : [];

    const zvanjaByPlayerB: PlayerZvanja[] =
      round.zvanjaByPlayerB && round.zvanjaByPlayerB.length > 0
        ? round.zvanjaByPlayerB
        : round.zvanjaPlayerIdB && round.zvanjaTeamB > 0
          ? [{ playerId: round.zvanjaPlayerIdB, points: round.zvanjaTeamB }]
          : [];
    const stigliaTeam =
      round.stigliaTeam === "A" || round.stigliaTeam === "B" ? round.stigliaTeam : null;
    const stigliaPoints = stigliaTeam ? 90 : 0;

    let pointsTeamA = round.pointsTeamA;
    let pointsTeamB = round.pointsTeamB;

    // Legacy migration: older fallback rows stored only partial defense points on fall.
    // Bela rule in this app: on fall, caller gets 0 and opposite team gets 162 + all zvanja.
    if (!round.callerSucceeded && round.callingTeam === "A") {
      pointsTeamA = 0;
      pointsTeamB = 162 + round.zvanjaTeamA + round.zvanjaTeamB + stigliaPoints;
    }
    if (!round.callerSucceeded && round.callingTeam === "B") {
      pointsTeamA = 162 + round.zvanjaTeamA + round.zvanjaTeamB + stigliaPoints;
      pointsTeamB = 0;
    }

    return {
      ...round,
      pointsTeamA,
      pointsTeamB,
      calledSuit: (calledSuit ?? "karo") as CalledSuit,
      // Keep marker for UI fallback when legacy rows had no called suit.
      ...(calledSuit ? {} : ({ calledSuitLegacyMissing: true } as Record<string, boolean>)),
      zvanjaPlayerIdA: round.zvanjaPlayerIdA ?? null,
      zvanjaPlayerIdB: round.zvanjaPlayerIdB ?? null,
      zvanjaByPlayerA,
      zvanjaByPlayerB,
      stigliaTeam,
    };
  }

  private async readDb(): Promise<LocalDb> {
    try {
      const raw = await readFile(this.dbPath, "utf-8");
      const parsed = JSON.parse(raw) as LocalDb;
      // Redci zapisani prije multi-tenancyja nemaju accountId; pripadaju
      // legacy računu, isto kao u migraciji 008.
      const own = <T extends { accountId?: string }>(row: T) => ({
        ...row,
        accountId: row.accountId ?? LEGACY_ACCOUNT_ID,
      });
      return {
        players: (parsed.players ?? []).map(own),
        groups: (parsed.groups ?? []).map(own),
        groupPlayers: (parsed.groupPlayers ?? []).map(own),
        games: (parsed.games ?? []).map(own),
        rounds: (parsed.rounds ?? []).map((round) => this.normalizeRound(own(round))),
      };
    } catch {
      return { players: [], groups: [], groupPlayers: [], games: [], rounds: [] };
    }
  }

  private async writeDb(db: LocalDb) {
    await mkdir(path.dirname(this.dbPath), { recursive: true });
    await writeFile(this.dbPath, JSON.stringify(db, null, 2), "utf-8");
  }

  private mine<T extends { accountId: string }>(rows: T[]) {
    return rows.filter((row) => row.accountId === this.accountId);
  }

  async listPlayers() {
    const db = await this.readDb();
    return this.mine(db.players).sort((a, b) => a.username.localeCompare(b.username));
  }

  async createPlayer(username: string) {
    const db = await this.readDb();
    const exists = this.mine(db.players).find(
      (player) => player.username.toLowerCase() === username.toLowerCase(),
    );
    if (exists) return exists;
    const player: Owned<Player> = {
      id: crypto.randomUUID(),
      username,
      createdAt: nowIso(),
      accountId: this.accountId,
    };
    db.players.push(player);
    await this.writeDb(db);
    return player;
  }

  async listGroups() {
    const db = await this.readDb();
    return this.mine(db.groups).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createGroup(name: string) {
    const db = await this.readDb();
    const existing = this.mine(db.groups).find(
      (group) => group.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) return existing;
    const group: Owned<PlayerGroup> = {
      id: crypto.randomUUID(),
      name,
      createdAt: nowIso(),
      accountId: this.accountId,
    };
    db.groups.push(group);
    await this.writeDb(db);
    return group;
  }

  async deleteGroup(groupId: string) {
    const db = await this.readDb();
    if (!this.mine(db.groups).some((row) => row.id === groupId)) return;
    db.groups = db.groups.filter((row) => row.id !== groupId);
    db.groupPlayers = db.groupPlayers.filter((row) => row.groupId !== groupId);
    await this.writeDb(db);
  }

  async renameGroup(groupId: string, name: string) {
    const db = await this.readDb();
    const group = this.mine(db.groups).find((row) => row.id === groupId);
    if (!group) throw new Error("Grupa nije pronađena");
    group.name = name;
    await this.writeDb(db);
    return group;
  }

  async listGroupPlayers(groupId: string) {
    const db = await this.readDb();
    if (!this.mine(db.groups).some((row) => row.id === groupId)) return [];
    const memberIds = this.mine(db.groupPlayers)
      .filter((row) => row.groupId === groupId)
      .map((row) => row.playerId);
    return this.mine(db.players)
      .filter((player) => memberIds.includes(player.id))
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async listAllGroupMembers() {
    const db = await this.readDb();
    const playersById = new Map(this.mine(db.players).map((player) => [player.id, player]));
    const map: Record<string, Player[]> = {};
    for (const row of this.mine(db.groupPlayers)) {
      const player = playersById.get(row.playerId);
      if (!player) continue;
      (map[row.groupId] ??= []).push(player);
    }
    for (const members of Object.values(map)) {
      members.sort((a, b) => a.username.localeCompare(b.username));
    }
    return map;
  }

  async addPlayerToGroup(groupId: string, playerId: string) {
    const db = await this.readDb();
    const group = this.mine(db.groups).find((row) => row.id === groupId);
    if (!group) throw new Error("Grupa nije pronađena");
    const player = this.mine(db.players).find((row) => row.id === playerId);
    if (!player) throw new Error("Igrač nije pronađen");
    const exists = db.groupPlayers.some(
      (row) => row.groupId === groupId && row.playerId === playerId,
    );
    if (!exists) {
      db.groupPlayers.push({ groupId, playerId, accountId: this.accountId });
      await this.writeDb(db);
    }
  }

  async removePlayerFromGroup(groupId: string, playerId: string) {
    const db = await this.readDb();
    const nextGroupPlayers = db.groupPlayers.filter(
      (row) =>
        !(
          row.groupId === groupId &&
          row.playerId === playerId &&
          row.accountId === this.accountId
        ),
    );
    if (nextGroupPlayers.length !== db.groupPlayers.length) {
      db.groupPlayers = nextGroupPlayers;
      await this.writeDb(db);
    }
  }

  async listGames() {
    const db = await this.readDb();
    return this.mine(db.games).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listFinishedGamesPage(limit: number, offset: number) {
    const db = await this.readDb();
    const finished = this.mine(db.games)
      .filter((game) => game.finishedAt !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const games = finished.slice(offset, offset + limit);
    return { games, hasMore: offset + limit < finished.length };
  }

  async getGame(id: string) {
    const db = await this.readDb();
    return this.mine(db.games).find((game) => game.id === id) ?? null;
  }

  async createGame(input: NewGameInput) {
    const db = await this.readDb();
    const game: Owned<Game> = {
      id: crypto.randomUUID(),
      dealerPlayerId: input.dealerPlayerId,
      createdAt: nowIso(),
      finishedAt: null,
      teams: { teamA: input.teamA, teamB: input.teamB },
      accountId: this.accountId,
    };
    db.games.push(game);
    await this.writeDb(db);
    return game;
  }

  async deleteGame(gameId: string) {
    const db = await this.readDb();
    if (!this.mine(db.games).some((game) => game.id === gameId)) return;
    db.games = db.games.filter((game) => game.id !== gameId);
    db.rounds = db.rounds.filter((round) => round.gameId !== gameId);
    await this.writeDb(db);
  }

  async finishGame(gameId: string) {
    const db = await this.readDb();
    const game = this.mine(db.games).find((row) => row.id === gameId);
    if (!game || game.finishedAt) return;
    game.finishedAt = nowIso();
    await this.writeDb(db);
  }

  async reopenGame(gameId: string) {
    const db = await this.readDb();
    const game = this.mine(db.games).find((row) => row.id === gameId);
    if (!game || game.finishedAt === null) return;
    game.finishedAt = null;
    await this.writeDb(db);
  }

  async listRounds(gameId: string) {
    const db = await this.readDb();
    return this.mine(db.rounds)
      .filter((round) => round.gameId === gameId)
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }

  async listRoundsForGames(gameIds: string[]) {
    const db = await this.readDb();
    const gameIdSet = new Set(gameIds);
    return this.mine(db.rounds)
      .filter((round) => gameIdSet.has(round.gameId))
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }

  async createRound(input: RoundInput) {
    const db = await this.readDb();
    const game = this.mine(db.games).find((candidate) => candidate.id === input.gameId);
    if (!game) {
      throw new Error("Partija nije pronađena");
    }
    const computed = computeRound(game, input);
    const currentRounds = this.mine(db.rounds)
      .filter((round) => round.gameId === input.gameId)
      .sort((a, b) => a.roundNumber - b.roundNumber);
    const row: Owned<Round> = {
      id: crypto.randomUUID(),
      roundNumber: currentRounds.length + 1,
      createdAt: nowIso(),
      ...computed,
      calledSuit: input.calledSuit,
      stigliaTeam: input.stigliaTeam,
      accountId: this.accountId,
    };
    db.rounds.push(row);
    await this.writeDb(db);
    return row;
  }

  async updateRound(roundId: string, input: RoundInput) {
    const db = await this.readDb();
    const game = this.mine(db.games).find((candidate) => candidate.id === input.gameId);
    if (!game) {
      throw new Error("Partija nije pronađena");
    }
    const existing = this.mine(db.rounds).find((round) => round.id === roundId);
    if (!existing) {
      throw new Error("Ruka nije pronađena");
    }
    if (existing.gameId !== input.gameId) {
      throw new Error("Ruka ne pripada partiji");
    }
    const computed = computeRound(game, input);
    const updated: Owned<Round> = {
      ...existing,
      ...computed,
      calledSuit: input.calledSuit,
      stigliaTeam: input.stigliaTeam,
    };
    db.rounds = db.rounds.map((round) => (round.id === roundId ? updated : round));
    await this.writeDb(db);
    return updated;
  }
}

// Dev fallback: jedan FileRepo po računu, keširan preko HMR reloada.
const fileRepos: Map<string, FileRepo> =
  (globalThis as { __belaFileRepos?: Map<string, FileRepo> }).__belaFileRepos ??
  new Map<string, FileRepo>();
(globalThis as { __belaFileRepos?: Map<string, FileRepo> }).__belaFileRepos = fileRepos;

function scopedFileRepo(accountId: string): BelaRepository {
  const existing = fileRepos.get(accountId);
  if (existing) return existing;
  const repo = new FileRepo(accountId);
  fileRepos.set(accountId, repo);
  return repo;
}

// Node's built-in fetch (undici) negotiates HTTP/2 with Supabase's Cloudflare
// edge, which corrupts TLS records under Next.js's dev-mode fetch wrapping
// (surfaces as "bad record mac" / ERR_HTTP2_INVALID_SESSION). Node's classic
// http/https modules never speak HTTP/2, so routing Supabase requests through
// them sidesteps the bug entirely. A bounded keep-alive pool (rather than a
// fresh connection per request) keeps N+1-style concurrent fetches (e.g.
// listRounds per game) fast without reintroducing the corruption.
const nodeHttp1Agent = new https.Agent({
  keepAlive: true,
  maxSockets: 6,
  ALPNProtocols: ["http/1.1"],
});

function nodeHttp1Fetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    const url = new URL(input.toString());
    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;

    const headers: Record<string, string> = {};
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(init.headers)) {
      for (const [key, value] of init.headers) headers[key] = value;
    } else if (init.headers) {
      Object.assign(headers, init.headers as Record<string, string>);
    }

    const body =
      typeof init.body === "string" ? init.body : init.body ? String(init.body) : undefined;
    if (body !== undefined && !("content-length" in headers) && !("Content-Length" in headers)) {
      headers["Content-Length"] = Buffer.byteLength(body).toString();
    }

    const request = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: init.method ?? "GET",
        headers,
        ...(isHttps ? { agent: nodeHttp1Agent, ALPNProtocols: ["http/1.1"] } : {}),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const responseHeaders = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (Array.isArray(value)) {
              for (const entry of value) responseHeaders.append(key, entry);
            } else if (value !== undefined) {
              responseHeaders.set(key, value);
            }
          }
          const status = res.statusCode ?? 200;
          // Fetch spec forbids a body on null-body statuses; Response throws otherwise.
          const isNullBodyStatus = status === 204 || status === 205 || status === 304;
          resolve(
            new Response(isNullBodyStatus ? null : Buffer.concat(chunks), {
              status,
              statusText: res.statusMessage ?? "",
              headers: responseHeaders,
            }),
          );
        });
      },
    );

    request.on("error", reject);
    if (body !== undefined) request.write(body);
    request.end();
  });
}

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Supabase env varijable nedostaju u produkciji. Postavi NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    return null;
  }
  return createClient(url, serviceRole, {
    global: { fetch: nodeHttp1Fetch as unknown as typeof fetch },
  });
}

/**
 * Repozitorij vezan uz jedan račun (grupu). Svaki upit filtrira po `account_id`,
 * a svaki insert ga postavlja — izolacija između grupa živi ovdje, na jednom
 * mjestu, umjesto da se ponavlja po rutama. RLS je uključen bez politika
 * (007_enable_rls.sql) i sve ide preko service-role ključa, pa baza sama ne
 * postavlja tu granicu.
 */
export function getRepo(accountId: string): BelaRepository {
  if (!accountId) throw new Error("getRepo zahtijeva accountId");
  const supabase = getSupabaseAdmin();
  if (!supabase) return scopedFileRepo(accountId);

  // group_players nema vlastiti account_id, pa se vlasništvo provjerava nad
  // roditeljima prije svakog pisanja.
  async function requireOwnedGroup(groupId: string) {
    const { data, error } = await supabase!
      .from("groups")
      .select("id")
      .eq("id", groupId)
      .eq("account_id", accountId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Grupa nije pronađena");
  }

  async function requireOwnedPlayer(playerId: string) {
    const { data, error } = await supabase!
      .from("players")
      .select("id")
      .eq("id", playerId)
      .eq("account_id", accountId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Igrač nije pronađen");
  }

  return {
    async listPlayers() {
      const { data, error } = await supabase
        .from("players")
        .select("id, username, created_at")
        .eq("account_id", accountId)
        .order("username", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        username: row.username,
        createdAt: row.created_at,
      }));
    },
    async createPlayer(username: string) {
      const { data, error } = await supabase
        .from("players")
        .insert({ username, account_id: accountId })
        .select("id, username, created_at")
        .single();
      if (error) throw error;
      return { id: data.id, username: data.username, createdAt: data.created_at };
    },
    async listGroups() {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name, created_at")
        .eq("account_id", accountId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
      }));
    },
    async createGroup(name: string) {
      const { data, error } = await supabase
        .from("groups")
        .insert({ name, account_id: accountId })
        .select("id, name, created_at")
        .single();
      if (error) throw error;
      return { id: data.id, name: data.name, createdAt: data.created_at };
    },
    async renameGroup(groupId: string, name: string) {
      const { data, error } = await supabase
        .from("groups")
        .update({ name })
        .eq("id", groupId)
        .eq("account_id", accountId)
        .select("id, name, created_at")
        .single();
      if (error) throw error;
      return { id: data.id, name: data.name, createdAt: data.created_at };
    },
    async deleteGroup(groupId: string) {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId)
        .eq("account_id", accountId);
      if (error) throw error;
    },
    async listGroupPlayers(groupId: string) {
      const { data, error } = await supabase
        .from("group_players")
        .select("player_id, players!inner(id, username, created_at), groups!inner(account_id)")
        .eq("group_id", groupId)
        .eq("groups.account_id", accountId)
        .eq("players.account_id", accountId);
      if (error) throw error;
      return (data ?? [])
        .map((row) => {
          const player = Array.isArray(row.players) ? row.players[0] : row.players;
          if (!player) return null;
          return {
            id: player.id as string,
            username: player.username as string,
            createdAt: player.created_at as string,
          };
        })
        .filter((row): row is Player => row !== null)
        .sort((a, b) => a.username.localeCompare(b.username));
    },
    async listAllGroupMembers() {
      const { data, error } = await supabase
        .from("group_players")
        .select("group_id, players!inner(id, username, created_at), groups!inner(account_id)")
        .eq("groups.account_id", accountId)
        .eq("players.account_id", accountId);
      if (error) throw error;
      const map: Record<string, Player[]> = {};
      for (const row of data ?? []) {
        const player = Array.isArray(row.players) ? row.players[0] : row.players;
        if (!player) continue;
        (map[row.group_id] ??= []).push({
          id: player.id as string,
          username: player.username as string,
          createdAt: player.created_at as string,
        });
      }
      for (const members of Object.values(map)) {
        members.sort((a, b) => a.username.localeCompare(b.username));
      }
      return map;
    },
    async addPlayerToGroup(groupId: string, playerId: string) {
      // Oba id-a dolaze od klijenta; bez ove provjere bi se igrač jednog računa
      // mogao ubaciti u grupu drugog.
      await requireOwnedGroup(groupId);
      await requireOwnedPlayer(playerId);
      const { error } = await supabase
        .from("group_players")
        .insert({ group_id: groupId, player_id: playerId });
      if (error && error.code !== "23505") throw error;
    },
    async removePlayerFromGroup(groupId: string, playerId: string) {
      await requireOwnedGroup(groupId);
      const { error } = await supabase
        .from("group_players")
        .delete()
        .eq("group_id", groupId)
        .eq("player_id", playerId);
      if (error) throw error;
    },
    async listGames() {
      const { data, error } = await supabase
        .from("games")
        .select("id, dealer_player_id, created_at, finished_at, teams")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        dealerPlayerId: row.dealer_player_id,
        createdAt: row.created_at,
        finishedAt: row.finished_at,
        teams: row.teams,
      }));
    },
    async listFinishedGamesPage(limit: number, offset: number) {
      // Fetch one extra row to detect whether further pages exist.
      const { data, error } = await supabase
        .from("games")
        .select("id, dealer_player_id, created_at, finished_at, teams")
        .eq("account_id", accountId)
        .not("finished_at", "is", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit);
      if (error) throw error;
      const rows = data ?? [];
      const hasMore = rows.length > limit;
      const games = rows.slice(0, limit).map((row) => ({
        id: row.id,
        dealerPlayerId: row.dealer_player_id,
        createdAt: row.created_at,
        finishedAt: row.finished_at,
        teams: row.teams,
      }));
      return { games, hasMore };
    },
    async getGame(id: string) {
      const { data, error } = await supabase
        .from("games")
        .select("id, dealer_player_id, created_at, finished_at, teams")
        .eq("id", id)
        .eq("account_id", accountId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        dealerPlayerId: data.dealer_player_id,
        createdAt: data.created_at,
        finishedAt: data.finished_at,
        teams: data.teams,
      };
    },
    async createGame(input: NewGameInput) {
      const { data, error } = await supabase
        .from("games")
        .insert({
          dealer_player_id: input.dealerPlayerId,
          teams: { teamA: input.teamA, teamB: input.teamB },
          account_id: accountId,
        })
        .select("id, dealer_player_id, created_at, finished_at, teams")
        .single();
      if (error) throw error;
      return {
        id: data.id,
        dealerPlayerId: data.dealer_player_id,
        createdAt: data.created_at,
        finishedAt: data.finished_at,
        teams: data.teams,
      };
    },
    async deleteGame(gameId: string) {
      const { error } = await supabase
        .from("games")
        .delete()
        .eq("id", gameId)
        .eq("account_id", accountId);
      if (error) throw error;
    },
    async finishGame(gameId: string) {
      const { error } = await supabase
        .from("games")
        .update({ finished_at: nowIso() })
        .eq("id", gameId)
        .eq("account_id", accountId)
        .is("finished_at", null);
      if (error) throw error;
    },
    async reopenGame(gameId: string) {
      const { error } = await supabase
        .from("games")
        .update({ finished_at: null })
        .eq("id", gameId)
        .eq("account_id", accountId);
      if (error) throw error;
    },
    async listRounds(gameId: string) {
      const { data, error } = await supabase
        .from("rounds")
        .select(
          "id, game_id, round_number, caller_player_id, called_suit, calling_team, points_team_a, points_team_b, zvanja_team_a, zvanja_team_b, zvanja_player_id_a, zvanja_player_id_b, zvanja_by_player_a, zvanja_by_player_b, stiglia_team, caller_succeeded, created_at",
        )
        .eq("game_id", gameId)
        .eq("account_id", accountId)
        .order("round_number", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        gameId: row.game_id,
        roundNumber: row.round_number,
        callerPlayerId: row.caller_player_id,
        calledSuit: row.called_suit,
        callingTeam: row.calling_team,
        pointsTeamA: row.points_team_a,
        pointsTeamB: row.points_team_b,
        zvanjaTeamA: row.zvanja_team_a,
        zvanjaTeamB: row.zvanja_team_b,
        zvanjaPlayerIdA: row.zvanja_player_id_a,
        zvanjaPlayerIdB: row.zvanja_player_id_b,
        zvanjaByPlayerA: Array.isArray(row.zvanja_by_player_a)
          ? (row.zvanja_by_player_a as PlayerZvanja[])
          : [],
        zvanjaByPlayerB: Array.isArray(row.zvanja_by_player_b)
          ? (row.zvanja_by_player_b as PlayerZvanja[])
          : [],
        stigliaTeam: row.stiglia_team,
        callerSucceeded: row.caller_succeeded,
        createdAt: row.created_at,
      }));
    },
    async listRoundsForGames(gameIds: string[]) {
      if (gameIds.length === 0) return [];
      const { data, error } = await supabase
        .from("rounds")
        .select(
          "id, game_id, round_number, caller_player_id, called_suit, calling_team, points_team_a, points_team_b, zvanja_team_a, zvanja_team_b, zvanja_player_id_a, zvanja_player_id_b, zvanja_by_player_a, zvanja_by_player_b, stiglia_team, caller_succeeded, created_at",
        )
        .in("game_id", gameIds)
        .eq("account_id", accountId)
        .order("round_number", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        gameId: row.game_id,
        roundNumber: row.round_number,
        callerPlayerId: row.caller_player_id,
        calledSuit: row.called_suit,
        callingTeam: row.calling_team,
        pointsTeamA: row.points_team_a,
        pointsTeamB: row.points_team_b,
        zvanjaTeamA: row.zvanja_team_a,
        zvanjaTeamB: row.zvanja_team_b,
        zvanjaPlayerIdA: row.zvanja_player_id_a,
        zvanjaPlayerIdB: row.zvanja_player_id_b,
        zvanjaByPlayerA: Array.isArray(row.zvanja_by_player_a)
          ? (row.zvanja_by_player_a as PlayerZvanja[])
          : [],
        zvanjaByPlayerB: Array.isArray(row.zvanja_by_player_b)
          ? (row.zvanja_by_player_b as PlayerZvanja[])
          : [],
        stigliaTeam: row.stiglia_team,
        callerSucceeded: row.caller_succeeded,
        createdAt: row.created_at,
      }));
    },
    async createRound(input: RoundInput) {
      const game = await this.getGame(input.gameId);
      if (!game) {
        throw new Error("Partija nije pronađena");
      }
      const computed = computeRound(game, input);
      const currentRounds = await this.listRounds(input.gameId);
      const { data, error } = await supabase
        .from("rounds")
        .insert({
          game_id: input.gameId,
          account_id: accountId,
          round_number: currentRounds.length + 1,
          caller_player_id: input.callerPlayerId,
          called_suit: input.calledSuit,
          calling_team: computed.callingTeam,
          points_team_a: computed.pointsTeamA,
          points_team_b: computed.pointsTeamB,
          zvanja_team_a: computed.zvanjaTeamA,
          zvanja_team_b: computed.zvanjaTeamB,
          zvanja_player_id_a: computed.zvanjaPlayerIdA,
          zvanja_player_id_b: computed.zvanjaPlayerIdB,
          zvanja_by_player_a: computed.zvanjaByPlayerA,
          zvanja_by_player_b: computed.zvanjaByPlayerB,
          stiglia_team: computed.stigliaTeam,
          caller_succeeded: computed.callerSucceeded,
        })
        .select(
          "id, game_id, round_number, caller_player_id, called_suit, calling_team, points_team_a, points_team_b, zvanja_team_a, zvanja_team_b, zvanja_player_id_a, zvanja_player_id_b, zvanja_by_player_a, zvanja_by_player_b, stiglia_team, caller_succeeded, created_at",
        )
        .single();

      if (error) throw error;
      return {
        id: data.id,
        gameId: data.game_id,
        roundNumber: data.round_number,
        callerPlayerId: data.caller_player_id,
        calledSuit: data.called_suit,
        callingTeam: data.calling_team,
        pointsTeamA: data.points_team_a,
        pointsTeamB: data.points_team_b,
        zvanjaTeamA: data.zvanja_team_a,
        zvanjaTeamB: data.zvanja_team_b,
        zvanjaPlayerIdA: data.zvanja_player_id_a,
        zvanjaPlayerIdB: data.zvanja_player_id_b,
        zvanjaByPlayerA: Array.isArray(data.zvanja_by_player_a)
          ? (data.zvanja_by_player_a as PlayerZvanja[])
          : [],
        zvanjaByPlayerB: Array.isArray(data.zvanja_by_player_b)
          ? (data.zvanja_by_player_b as PlayerZvanja[])
          : [],
        stigliaTeam: data.stiglia_team,
        callerSucceeded: data.caller_succeeded,
        createdAt: data.created_at,
      };
    },
    async updateRound(roundId: string, input: RoundInput) {
      const game = await this.getGame(input.gameId);
      if (!game) {
        throw new Error("Partija nije pronađena");
      }
      const existingRounds = await this.listRounds(input.gameId);
      const existingRound = existingRounds.find((round) => round.id === roundId);
      if (!existingRound) {
        throw new Error("Ruka nije pronađena");
      }
      const computed = computeRound(game, input);
      const { data, error } = await supabase
        .from("rounds")
        .update({
          caller_player_id: input.callerPlayerId,
          called_suit: input.calledSuit,
          calling_team: computed.callingTeam,
          points_team_a: computed.pointsTeamA,
          points_team_b: computed.pointsTeamB,
          zvanja_team_a: computed.zvanjaTeamA,
          zvanja_team_b: computed.zvanjaTeamB,
          zvanja_player_id_a: computed.zvanjaPlayerIdA,
          zvanja_player_id_b: computed.zvanjaPlayerIdB,
          zvanja_by_player_a: computed.zvanjaByPlayerA,
          zvanja_by_player_b: computed.zvanjaByPlayerB,
          stiglia_team: computed.stigliaTeam,
          caller_succeeded: computed.callerSucceeded,
        })
        .eq("id", roundId)
        .eq("game_id", input.gameId)
        .eq("account_id", accountId)
        .select(
          "id, game_id, round_number, caller_player_id, called_suit, calling_team, points_team_a, points_team_b, zvanja_team_a, zvanja_team_b, zvanja_player_id_a, zvanja_player_id_b, zvanja_by_player_a, zvanja_by_player_b, stiglia_team, caller_succeeded, created_at",
        )
        .single();
      if (error) throw error;
      return {
        id: data.id,
        gameId: data.game_id,
        roundNumber: data.round_number,
        callerPlayerId: data.caller_player_id,
        calledSuit: data.called_suit,
        callingTeam: data.calling_team,
        pointsTeamA: data.points_team_a,
        pointsTeamB: data.points_team_b,
        zvanjaTeamA: data.zvanja_team_a,
        zvanjaTeamB: data.zvanja_team_b,
        zvanjaPlayerIdA: data.zvanja_player_id_a,
        zvanjaPlayerIdB: data.zvanja_player_id_b,
        zvanjaByPlayerA: Array.isArray(data.zvanja_by_player_a)
          ? (data.zvanja_by_player_a as PlayerZvanja[])
          : [],
        zvanjaByPlayerB: Array.isArray(data.zvanja_by_player_b)
          ? (data.zvanja_by_player_b as PlayerZvanja[])
          : [],
        stigliaTeam: data.stiglia_team,
        callerSucceeded: data.caller_succeeded,
        createdAt: data.created_at,
      };
    },
  };
}
