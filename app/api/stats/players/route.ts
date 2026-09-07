import { NextResponse } from "next/server";
import { getCachedPlayerStats } from "@/lib/cachedStats";
import { getSessionAccountId, unauthorized } from "@/lib/session";

export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();
  const stats = await getCachedPlayerStats(accountId);
  return NextResponse.json({ stats });
}
