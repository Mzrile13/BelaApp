import Link from "next/link";
import { notFound } from "next/navigation";
import { Swords } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { RatingChart, type RatingPoint } from "@/components/RatingChart";
import { PlayerStatsCard } from "@/components/PlayerStatsCard";
import { HistoryList } from "@/components/HistoryList";
import { getCachedAllStats, getCachedDataset, getCachedRatingData } from "@/lib/cachedStats";
import { DEFAULT_RATING_CONFIG } from "@/lib/rating";
import { HISTORY_PAGE_SIZE, getHistoryFilterOptions, getHistoryPage } from "@/lib/history";
import { requireAccountId } from "@/lib/session";

export default async function PlayerPage(props: PageProps<"/players/[username]">) {
  const { username } = await props.params;
  const accountId = await requireAccountId();
  // Prije je ova stranica pri svakom otvaranju povukla cijelu povijest računa i
  // iznova izračunala statistiku svih igrača. Oboje je isto što leaderboard već
  // ima izračunato i keširano, pa se sada samo čita iz istog cachea.
  // Paralelno: statistika dijeli isto čitanje dataseta (lib/cachedStats.ts).
  const [{ players }, stats] = await Promise.all([
    getCachedDataset(accountId),
    getCachedAllStats(accountId),
  ]);
  const row = stats.players.find(
    (item) => item.username.toLowerCase() === username.toLowerCase(),
  );

  if (!row) notFound();

  const player = players.find((item) => item.id === row.playerId);
  if (!player) notFound();
  const [page, filterOptions, ratingData] = await Promise.all([
    getHistoryPage(accountId, { playerId: player.id }, 0, HISTORY_PAGE_SIZE),
    getHistoryFilterOptions(accountId, player.id),
    getCachedRatingData(accountId),
  ]);
  const ratingPoints: RatingPoint[] = (ratingData.historyByPlayer[player.id] ?? []).map((entry) => ({
    gameId: entry.gameId,
    createdAt: entry.createdAt,
    season: entry.season,
    rating: entry.ratingAfter,
    delta: entry.delta,
    won: entry.won,
  }));
  const compareBase = `/usporedba?a=${encodeURIComponent(row.username)}`;

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/leaderboard" className="mb-3" />
      <PlayerStatsCard stats={row} />

      <section className="mt-3 rounded-[18px] border border-white/5 bg-panel/50 p-4">
        <h2 className="mb-2 text-[15px] font-bold text-heading">Rejting kroz partije</h2>
        <RatingChart points={ratingPoints} initialRating={DEFAULT_RATING_CONFIG.initialRating} />
      </section>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={compareBase}
          className="inline-flex items-center gap-1.5 rounded-[12px] border border-subtle/30 px-3 py-2 text-[12.5px] font-bold text-soft"
        >
          <Swords size={15} aria-hidden /> Usporedi s…
        </Link>
        {row.nemesisUsername ? (
          <Link
            href={`${compareBase}&b=${encodeURIComponent(row.nemesisUsername)}`}
            className="inline-flex items-center gap-1.5 rounded-[12px] border border-subtle/30 px-3 py-2 text-[12.5px] font-bold text-soft"
          >
            Usporedi s nemezisom ({row.nemesisUsername})
          </Link>
        ) : null}
      </div>
      <h2 className="mb-3 mt-4 text-lg font-semibold text-heading">Partije igrača</h2>
      <HistoryList
        initialRows={page.rows}
        initialHasMore={page.hasMore}
        initialNextOffset={page.nextOffset}
        pageSize={HISTORY_PAGE_SIZE}
        filterOptions={filterOptions}
        lockedPlayerId={player.id}
      />
    </main>
  );
}
