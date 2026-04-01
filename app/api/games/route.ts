import { NextResponse } from "next/server";
import { getRepo } from "@/lib/supabase";
import { createGameSchema } from "@/lib/validation";

export async function GET() {
  const repo = getRepo();
  const games = await repo.listGames();
  return NextResponse.json({ games });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createGameSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Neispravan payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [a1, a2] = parsed.data.teamA;
  const [b1, b2] = parsed.data.teamB;
  const unique = new Set([a1, a2, b1, b2]);
  if (unique.size !== 4) {
    return NextResponse.json(
      { error: "Sva 4 igrača moraju biti različita" },
      { status: 400 },
    );
  }
  if (!unique.has(parsed.data.dealerPlayerId)) {
    return NextResponse.json(
      { error: "Prvi djelitelj mora biti jedan od odabranih 4 igrača" },
      { status: 400 },
    );
  }

  const repo = getRepo();
  const game = await repo.createGame(parsed.data);
  return NextResponse.json({ game }, { status: 201 });
}
