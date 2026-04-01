import { NextResponse } from "next/server";
import { getRepo } from "@/lib/supabase";
import { createPlayerSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const repo = getRepo();
  const players = await repo.listPlayers();
  return NextResponse.json(
    { players },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    },
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createPlayerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Neispravan payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const repo = getRepo();
  const player = await repo.createPlayer(parsed.data.username);
  return NextResponse.json({ player }, { status: 201 });
}
