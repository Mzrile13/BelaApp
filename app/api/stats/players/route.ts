import { NextResponse } from "next/server";
import { getRepo } from "@/lib/supabase";
import { computePlayerStats } from "@/lib/stats";

export async function GET() {
  const repo = getRepo();
  const players = await repo.listPlayers();
  const games = await repo.listGames();
  const rounds = (await Promise.all(games.map((game) => repo.listRounds(game.id)))).flat();
  const stats = computePlayerStats(players, games, rounds);
  return NextResponse.json({ stats });
}
