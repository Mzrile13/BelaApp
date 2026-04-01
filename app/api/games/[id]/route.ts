import { NextResponse } from "next/server";
import { getRepo } from "@/lib/supabase";
import { getGameScore } from "@/lib/scoring";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const repo = getRepo();
  const game = await repo.getGame(id);

  if (!game) {
    return NextResponse.json({ error: "Partija nije pronađena" }, { status: 404 });
  }

  const rounds = await repo.listRounds(id);
  const score = getGameScore(rounds);

  return NextResponse.json({
    game,
    rounds,
    score,
  });
}
