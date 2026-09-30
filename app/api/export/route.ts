import { getCachedDataset } from "@/lib/cachedStats";
import { buildExportCsv, type ExportType } from "@/lib/export";
import { seasonFromSlug, seasonSlug } from "@/lib/season";
import { getSessionAccountId, unauthorized } from "@/lib/session";
import { getRepo } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const accountId = await getSessionAccountId();
  if (!accountId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const type: ExportType = searchParams.get("type") === "rounds" ? "rounds" : "games";
  const seasonParam = searchParams.get("season");
  const season = seasonParam ? seasonFromSlug(seasonParam) : null;
  if (seasonParam && !season) {
    return Response.json({ error: "Neispravna sezona" }, { status: 400 });
  }

  const [dataset, comments] = await Promise.all([
    getCachedDataset(accountId),
    getRepo(accountId).listGameComments().catch(() => ({})),
  ]);
  const csv = buildExportCsv(type, { ...dataset, comments, season });

  const date = new Date().toISOString().slice(0, 10);
  const fileName = `bela-${type === "games" ? "partije" : "ruke"}${season ? `-${seasonSlug(season)}` : ""}-${date}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
