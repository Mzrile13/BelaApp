import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { PlayerStatsCard } from "@/components/PlayerStatsCard";
import { HistoryList } from "@/components/HistoryList";
import { getCachedAllStats, getCachedDataset } from "@/lib/cachedStats";
import { HISTORY_PAGE_SIZE, getHistoryFilterOptions, getHistoryPage } from "@/lib/history";
import { requireAccountId } from "@/lib/session";

export default async function PlayerPage(props: PageProps<"/players/[username]">) {
  const { username } = await props.params;
  const accountId = await requireAccountId();
  // Prije je ova stranica pri svakom otvaranju povukla cijelu povijest računa i
  // iznova izračunala statistiku svih igrača. Oboje je isto što leaderboard već
  // ima izračunato i keširano, pa se sada samo čita iz istog cachea.
  //
  // Namjerno u nizu, a ne u Promise.all: statistika se i sama gradi nad ovim
  // datasetom, pa mu prvi await napuni cache koji drugi onda samo pročita. U
  // paraleli bi hladan cache značio dva ista dohvata iz baze.
  const { players } = await getCachedDataset(accountId);
  const stats = await getCachedAllStats(accountId);
  const row = stats.players.find(
    (item) => item.username.toLowerCase() === username.toLowerCase(),
  );

  if (!row) notFound();

  const player = players.find((item) => item.id === row.playerId);
  if (!player) notFound();
  const [page, filterOptions] = await Promise.all([
    getHistoryPage(accountId, { playerId: player.id }, 0, HISTORY_PAGE_SIZE),
    getHistoryFilterOptions(accountId, player.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/leaderboard" className="mb-3" />
      <PlayerStatsCard stats={row} />
      <h2 className="mb-3 mt-4 text-lg font-semibold text-[#f7fbf6]">Partije igrača</h2>
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
