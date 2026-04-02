import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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
  addPlayerToGroup(groupId: string, playerId: string): Promise<void>;
  removePlayerFromGroup(groupId: string, playerId: string): Promise<void>;
  listGames(): Promise<Game[]>;
  getGame(id: string): Promise<Nullable<Game>>;
  createGame(input: NewGameInput): Promise<Game>;
  deleteGame(gameId: string): Promise<void>;
  finishGame(gameId: string): Promise<void>;
  reopenGame(gameId: string): Promise<void>;
  listRounds(gameId: string): Promise<Round[]>;
  createRound(input: RoundInput): Promise<Round>;
  updateRound(roundId: string, input: RoundInput): Promise<Round>;
}

function nowIso() {
  return new Date().toISOString();
}

class InMemoryRepo implements BelaRepository {
  private readonly players: Player[] = [];
  private readonly groups: PlayerGroup[] = [];
  private readonly groupPlayers: Array<{ groupId: string; playerId: string }> = [];
  private readonly games: Game[] = [];
  private readonly rounds: Round[] = [];

  async listPlayers() {
    return [...this.players].sort((a, b) => a.username.localeCompare(b.username));
  }

  async createPlayer(username: string) {
    const exists = this.players.find(
      (player) => player.username.toLowerCase() === username.toLowerCase(),
    );
    if (exists) return exists;

    const player: Player = {
      id: crypto.randomUUID(),
      username,
      createdAt: nowIso(),
    };
    this.players.push(player);
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
    const group: PlayerGroup = {
      id: crypto.randomUUID(),
      name,
      createdAt: nowIso(),
    };
    this.groups.push(group);
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
    this.groupPlayers.splice(
      0,
      this.groupPlayers.length,
      ...this.groupPlayers.filter((row) => row.groupId !== groupId),
    );
    const groupIndex = this.groups.findIndex((row) => row.id === groupId);
    if (groupIndex >= 0) this.groups.splice(groupIndex, 1);
  }

  async listGroupPlayers(groupId: string) {
    const memberIds = this.groupPlayers
      .filter((row) => row.groupId === groupId)
      .map((row) => row.playerId);
    return this.players
      .filter((player) => memberIds.includes(player.id))
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async addPlayerToGroup(groupId: string, playerId: string) {
    const group = this.groups.find((row) => row.id === groupId);
    if (!group) throw new Error("Grupa nije pronađena");
    const player = this.players.find((row) => row.id === playerId);
    if (!player) throw new Error("Igrač nije pronađen");
    const exists = this.groupPlayers.some(
      (row) => row.groupId === groupId && row.playerId === playerId,
    );
    if (!exists) {
      this.groupPlayers.push({ groupId, playerId });
    }
  }

  async removePlayerFromGroup(groupId: string, playerId: string) {
    const index = this.groupPlayers.findIndex(
      (row) => row.groupId === groupId && row.playerId === playerId,
    );
    if (index >= 0) {
      this.groupPlayers.splice(index, 1);
    }
  }

  async listGames() {
    return [...this.games].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getGame(id: string) {
    return this.games.find((game) => game.id === id) ?? null;
  }

  async createGame(input: NewGameInput) {
    const game: Game = {
      id: crypto.randomUUID(),
      dealerPlayerId: input.dealerPlayerId,
      createdAt: nowIso(),
      finishedAt: null,
      teams: { teamA: input.teamA, teamB: input.teamB },
    };
    this.games.push(game);
    return game;
  }

  async deleteGame(gameId: string) {
    this.rounds.splice(
      0,
      this.rounds.length,
      ...this.rounds.filter((round) => round.gameId !== gameId),
    );
    const gameIndex = this.games.findIndex((game) => game.id === gameId);
    if (gameIndex >= 0) this.games.splice(gameIndex, 1);
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

  async createRound(input: RoundInput) {
    const game = await this.getGame(input.gameId);
    if (!game) {
      throw new Error("Partija nije pronađena");
    }
    const computed = computeRound(game, input);
    const currentRounds = await this.listRounds(input.gameId);

    const row: Round = {
      id: crypto.randomUUID(),
      roundNumber: currentRounds.length + 1,
      createdAt: nowIso(),
      ...computed,
    };
    this.rounds.push(row);
    return row;
  }

  async updateRound(roundId: string, input: RoundInput) {
    const game = await this.getGame(input.gameId);
    if (!game) {
      throw new Error("Partija nije pronađena");
    }
    const roundIndex = this.rounds.findIndex((round) => round.id === roundId);
    if (roundIndex < 0) {
      throw new Error("Ruka nije pronađena");
    }
    const existing = this.rounds[roundIndex];
    if (existing.gameId !== input.gameId) {
      throw new Error("Ruka ne pripada partiji");
    }
    const computed = computeRound(game, input);
    const updated: Round = {
      ...existing,
      ...computed,
      calledSuit: input.calledSuit,
      stigliaTeam: input.stigliaTeam,
    };
    this.rounds[roundIndex] = updated;
    return updated;
  }
}

interface LocalDb {
  players: Player[];
  groups: PlayerGroup[];
  groupPlayers: Array<{ groupId: string; playerId: string }>;
  games: Game[];
  rounds: Round[];
}

const allowedSuits: CalledSuit[] = ["karo", "herc", "pik", "tref"];

class FileRepo implements BelaRepository {
  private readonly dbPath = path.join(process.cwd(), ".data", "bela-db.json");

  private normalizeRound(round: Round): Round {
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
      return {
        players: parsed.players ?? [],
        groups: parsed.groups ?? [],
        groupPlayers: parsed.groupPlayers ?? [],
        games: parsed.games ?? [],
        rounds: (parsed.rounds ?? []).map((round) => this.normalizeRound(round)),
      };
    } catch {
      return { players: [], groups: [], groupPlayers: [], games: [], rounds: [] };
    }
  }

  private async writeDb(db: LocalDb) {
    await mkdir(path.dirname(this.dbPath), { recursive: true });
    await writeFile(this.dbPath, JSON.stringify(db, null, 2), "utf-8");
  }

  async listPlayers() {
    const db = await this.readDb();
    return [...db.players].sort((a, b) => a.username.localeCompare(b.username));
  }

  async createPlayer(username: string) {
    const db = await this.readDb();
    const exists = db.players.find(
      (player) => player.username.toLowerCase() === username.toLowerCase(),
    );
    if (exists) return exists;
    const player: Player = {
      id: crypto.randomUUID(),
      username,
      createdAt: nowIso(),
    };
    db.players.push(player);
    await this.writeDb(db);
    return player;
  }

  async listGroups() {
    const db = await this.readDb();
    return [...db.groups].sort((a, b) => a.name.localeCompare(b.name));
  }

  async createGroup(name: string) {
    const db = await this.readDb();
    const existing = db.groups.find((group) => group.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const group: PlayerGroup = {
      id: crypto.randomUUID(),
      name,
      createdAt: nowIso(),
    };
    db.groups.push(group);
    await this.writeDb(db);
    return group;
  }

  async deleteGroup(groupId: string) {
    const db = await this.readDb();
    const nextGroups = db.groups.filter((row) => row.id !== groupId);
    const nextGroupPlayers = db.groupPlayers.filter((row) => row.groupId !== groupId);
    if (nextGroups.length !== db.groups.length || nextGroupPlayers.length !== db.groupPlayers.length) {
      db.groups = nextGroups;
      db.groupPlayers = nextGroupPlayers;
      await this.writeDb(db);
    }
  }

  async renameGroup(groupId: string, name: string) {
    const db = await this.readDb();
    const group = db.groups.find((row) => row.id === groupId);
    if (!group) throw new Error("Grupa nije pronađena");
    group.name = name;
    await this.writeDb(db);
    return group;
  }

  async listGroupPlayers(groupId: string) {
    const db = await this.readDb();
    const memberIds = db.groupPlayers
      .filter((row) => row.groupId === groupId)
      .map((row) => row.playerId);
    return db.players
      .filter((player) => memberIds.includes(player.id))
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async addPlayerToGroup(groupId: string, playerId: string) {
    const db = await this.readDb();
    const group = db.groups.find((row) => row.id === groupId);
    if (!group) throw new Error("Grupa nije pronađena");
    const player = db.players.find((row) => row.id === playerId);
    if (!player) throw new Error("Igrač nije pronađen");
    const exists = db.groupPlayers.some(
      (row) => row.groupId === groupId && row.playerId === playerId,
    );
    if (!exists) {
      db.groupPlayers.push({ groupId, playerId });
      await this.writeDb(db);
    }
  }

  async removePlayerFromGroup(groupId: string, playerId: string) {
    const db = await this.readDb();
    const nextGroupPlayers = db.groupPlayers.filter(
      (row) => !(row.groupId === groupId && row.playerId === playerId),
    );
    if (nextGroupPlayers.length !== db.groupPlayers.length) {
      db.groupPlayers = nextGroupPlayers;
      await this.writeDb(db);
    }
  }

  async listGames() {
    const db = await this.readDb();
    return [...db.games].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getGame(id: string) {
    const db = await this.readDb();
    return db.games.find((game) => game.id === id) ?? null;
  }

  async createGame(input: NewGameInput) {
    const db = await this.readDb();
    const game: Game = {
      id: crypto.randomUUID(),
      dealerPlayerId: input.dealerPlayerId,
      createdAt: nowIso(),
      finishedAt: null,
      teams: { teamA: input.teamA, teamB: input.teamB },
    };
    db.games.push(game);
    await this.writeDb(db);
    return game;
  }

  async deleteGame(gameId: string) {
    const db = await this.readDb();
    const nextGames = db.games.filter((game) => game.id !== gameId);
    const nextRounds = db.rounds.filter((round) => round.gameId !== gameId);
    if (nextGames.length !== db.games.length || nextRounds.length !== db.rounds.length) {
      db.games = nextGames;
      db.rounds = nextRounds;
      await this.writeDb(db);
    }
  }

  async finishGame(gameId: string) {
    const db = await this.readDb();
    const game = db.games.find((row) => row.id === gameId);
    if (!game || game.finishedAt) return;
    game.finishedAt = nowIso();
    await this.writeDb(db);
  }

  async reopenGame(gameId: string) {
    const db = await this.readDb();
    const game = db.games.find((row) => row.id === gameId);
    if (!game || game.finishedAt === null) return;
    game.finishedAt = null;
    await this.writeDb(db);
  }

  async listRounds(gameId: string) {
    const db = await this.readDb();
    return db.rounds
      .filter((round) => round.gameId === gameId)
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }

  async createRound(input: RoundInput) {
    const db = await this.readDb();
    const game = db.games.find((candidate) => candidate.id === input.gameId);
    if (!game) {
      throw new Error("Partija nije pronađena");
    }
    const computed = computeRound(game, input);
    const currentRounds = db.rounds
      .filter((round) => round.gameId === input.gameId)
      .sort((a, b) => a.roundNumber - b.roundNumber);
    const row: Round = {
      id: crypto.randomUUID(),
      roundNumber: currentRounds.length + 1,
      createdAt: nowIso(),
      ...computed,
      calledSuit: input.calledSuit,
        stigliaTeam: input.stigliaTeam,
    };
    db.rounds.push(row);
    await this.writeDb(db);
    return row;
  }

  async updateRound(roundId: string, input: RoundInput) {
    const db = await this.readDb();
    const game = db.games.find((candidate) => candidate.id === input.gameId);
    if (!game) {
      throw new Error("Partija nije pronađena");
    }
    const roundIndex = db.rounds.findIndex((round) => round.id === roundId);
    if (roundIndex < 0) {
      throw new Error("Ruka nije pronađena");
    }
    const existing = db.rounds[roundIndex];
    if (existing.gameId !== input.gameId) {
      throw new Error("Ruka ne pripada partiji");
    }
    const computed = computeRound(game, input);
    const updated: Round = {
      ...existing,
      ...computed,
      calledSuit: input.calledSuit,
      stigliaTeam: input.stigliaTeam,
    };
    db.rounds[roundIndex] = updated;
    await this.writeDb(db);
    return updated;
  }
}

const memoryRepo =
  (globalThis as { __belaMemoryRepo?: InMemoryRepo }).__belaMemoryRepo ??
  new InMemoryRepo();
(globalThis as { __belaMemoryRepo?: InMemoryRepo }).__belaMemoryRepo = memoryRepo;

const fileRepo =
  (globalThis as { __belaFileRepo?: FileRepo }).__belaFileRepo ?? new FileRepo();
(globalThis as { __belaFileRepo?: FileRepo }).__belaFileRepo = fileRepo;

function getSupabaseAdmin() {
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
  return createClient(url, serviceRole);
}

export function getRepo(): BelaRepository {
  const supabase = getSupabaseAdmin();
  if (!supabase) return fileRepo;

  return {
    async listPlayers() {
      const { data, error } = await supabase
        .from("players")
        .select("id, username, created_at")
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
        .insert({ username })
        .select("id, username, created_at")
        .single();
      if (error) throw error;
      return { id: data.id, username: data.username, createdAt: data.created_at };
    },
    async listGroups() {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name, created_at")
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
        .insert({ name })
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
        .select("id, name, created_at")
        .single();
      if (error) throw error;
      return { id: data.id, name: data.name, createdAt: data.created_at };
    },
    async deleteGroup(groupId: string) {
      const { error } = await supabase.from("groups").delete().eq("id", groupId);
      if (error) throw error;
    },
    async listGroupPlayers(groupId: string) {
      const { data, error } = await supabase
        .from("group_players")
        .select("player_id, players!inner(id, username, created_at)")
        .eq("group_id", groupId);
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
    async addPlayerToGroup(groupId: string, playerId: string) {
      const { error } = await supabase
        .from("group_players")
        .insert({ group_id: groupId, player_id: playerId });
      if (error && error.code !== "23505") throw error;
    },
    async removePlayerFromGroup(groupId: string, playerId: string) {
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
    async getGame(id: string) {
      const { data, error } = await supabase
        .from("games")
        .select("id, dealer_player_id, created_at, finished_at, teams")
        .eq("id", id)
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
      const { error } = await supabase.from("games").delete().eq("id", gameId);
      if (error) throw error;
    },
    async finishGame(gameId: string) {
      const { error } = await supabase
        .from("games")
        .update({ finished_at: nowIso() })
        .eq("id", gameId)
        .is("finished_at", null);
      if (error) throw error;
    },
    async reopenGame(gameId: string) {
      const { error } = await supabase
        .from("games")
        .update({ finished_at: null })
        .eq("id", gameId);
      if (error) throw error;
    },
    async listRounds(gameId: string) {
      const { data, error } = await supabase
        .from("rounds")
        .select(
          "id, game_id, round_number, caller_player_id, called_suit, calling_team, points_team_a, points_team_b, zvanja_team_a, zvanja_team_b, zvanja_player_id_a, zvanja_player_id_b, zvanja_by_player_a, zvanja_by_player_b, stiglia_team, caller_succeeded, created_at",
        )
        .eq("game_id", gameId)
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
