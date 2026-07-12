import { NextResponse } from "next/server";
import { getCachedPlayerStats } from "@/lib/cachedStats";

export async function GET() {
  const stats = await getCachedPlayerStats();
  return NextResponse.json({ stats });
}
