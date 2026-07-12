import { NextResponse } from "next/server";
import { HISTORY_PAGE_SIZE, getHistoryPage } from "@/lib/history";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Math.floor(Number(searchParams.get("offset")) || 0));
  const limitRaw = Math.floor(Number(searchParams.get("limit")) || HISTORY_PAGE_SIZE);
  const limit = Math.min(50, Math.max(1, limitRaw));

  const page = await getHistoryPage(offset, limit);
  return NextResponse.json(page);
}
