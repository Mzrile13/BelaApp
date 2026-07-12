import { NextResponse } from "next/server";
import { getCachedPairStats } from "@/lib/cachedStats";

export async function GET() {
  const stats = await getCachedPairStats();
  return NextResponse.json({ stats });
}
