import { unstable_noStore as noStore } from "next/cache";
import { BackButton } from "@/components/BackButton";
import { HistoryList } from "@/components/HistoryList";
import { HISTORY_PAGE_SIZE, getHistoryPage } from "@/lib/history";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function HistoryPage() {
  noStore();
  const page = await getHistoryPage(0, HISTORY_PAGE_SIZE);

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/" className="mb-3" />
      <section className="card p-4">
        <h1 className="text-xl font-bold text-[#f7fbf6]">Povijest partija</h1>
        <p className="text-sm text-[#a9c2b3]">Pregled svih odigranih partija.</p>
      </section>

      <div className="mt-4">
        <HistoryList
          initialRows={page.rows}
          initialHasMore={page.hasMore}
          initialNextOffset={page.nextOffset}
          pageSize={HISTORY_PAGE_SIZE}
        />
      </div>
    </main>
  );
}
