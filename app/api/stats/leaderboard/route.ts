import { NextResponse } from "next/server";
import { getCachedPlayerStats } from "@/lib/cachedStats";

export async function GET() {
  const rawRows = await getCachedPlayerStats();
  const leaderboard = rawRows
    .filter((row) => row.gamesPlayed > 0)
    .map((row, index) => ({
      rank: index + 1,
      ...row,
    }));

  return NextResponse.json({ leaderboard });
}
