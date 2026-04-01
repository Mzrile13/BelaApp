import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CalledSuit,
  Game,
  NewGameInput,
  Player,
  PlayerZvanja,
  Round,
  RoundInput,
} from "@/lib/types";
import { computeRound } from "@/lib/scoring";

type Nullable<T> = T | null;

interface BelaRepository {
  listPlayers(): Promise<Player[]>;
  createPlayer(username: string): Promise<Player>;
  listGames(): Promise<Game[]>;
  getGame(id: string): Promise<Nullable<Game>>;
  createGame(input: NewGameInput): Promise<Game>;
  finishGame(gameId: string): Promise<void>;
  listRounds(gameId: string): Promise<Round[]>;
  createRound(input: RoundInput): Promise<Round>;
}

function nowIso() {
  return new Date().toISOString();
}

class InMemoryRepo implements BelaRepository {
  private readonly players: Player[] = [];
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

  async finishGame(gameId: string) {
    const game = this.games.find((row) => row.id === gameId);
    if (!game || game.finishedAt) return;
    game.finishedAt = nowIso();
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
}

interface LocalDb {
  players: Player[];
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
        ...parsed,
        rounds: (parsed.rounds ?? []).map((round) => this.normalizeRound(round)),
      };
    } catch {
      return { players: [], games: [], rounds: [] };
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

  async finishGame(gameId: string) {
    const db = await this.readDb();
    const game = db.games.find((row) => row.id === gameId);
    if (!game || game.finishedAt) return;
    game.finishedAt = nowIso();
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
  if (!url || !serviceRole) return null;
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
    async finishGame(gameId: string) {
      const { error } = await supabase
        .from("games")
        .update({ finished_at: nowIso() })
        .eq("id", gameId)
        .is("finished_at", null);
      if (error) throw error;
    },
    async listRounds(gameId: string) {
      const { data, error } = await supabase
        .from("rounds")
        .select(
          "id, game_id, round_number, caller_player_id, called_suit, calling_team, points_team_a, points_team_b, zvanja_team_a, zvanja_team_b, zvanja_player_id_a, zvanja_player_id_b, stiglia_team, caller_succeeded, created_at",
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
          stiglia_team: computed.stigliaTeam,
          caller_succeeded: computed.callerSucceeded,
        })
        .select(
          "id, game_id, round_number, caller_player_id, called_suit, calling_team, points_team_a, points_team_b, zvanja_team_a, zvanja_team_b, zvanja_player_id_a, zvanja_player_id_b, stiglia_team, caller_succeeded, created_at",
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
        stigliaTeam: data.stiglia_team,
        callerSucceeded: data.caller_succeeded,
        createdAt: data.created_at,
      };
    },
  };
}
