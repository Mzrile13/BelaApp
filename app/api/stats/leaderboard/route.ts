import { NextResponse } from "next/server";
import { getCachedPlayerStats } from "@/lib/cachedStats";
import { getSessionAccountId, unauthorized } from "@/lib/session";

export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();
  const rawRows = await getCachedPlayerStats(accountId);
  const leaderboard = rawRows
    .filter((row) => row.gamesPlayed > 0)
    .map((row, index) => ({
      rank: index + 1,
      ...row,
    }));

  return NextResponse.json({ leaderboard });
}
