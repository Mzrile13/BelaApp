import { unstable_noStore as noStore } from "next/cache";
import { BackButton } from "@/components/BackButton";
import { HistoryList } from "@/components/HistoryList";
import { HISTORY_PAGE_SIZE, getHistoryFilterOptions, getHistoryPage } from "@/lib/history";
import { requireAccountId } from "@/lib/session";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function HistoryPage() {
  noStore();
  const accountId = await requireAccountId();
  const [page, filterOptions] = await Promise.all([
    getHistoryPage(accountId, {}, 0, HISTORY_PAGE_SIZE),
    getHistoryFilterOptions(accountId),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/" className="mb-3" />
      <section className="card p-4">
        <h1 className="text-xl font-bold text-heading">Povijest partija</h1>
        <p className="text-sm text-subtle">Pregled svih odigranih partija.</p>
      </section>

      <div className="mt-4">
        <HistoryList
          initialRows={page.rows}
          initialHasMore={page.hasMore}
          initialNextOffset={page.nextOffset}
          pageSize={HISTORY_PAGE_SIZE}
          filterOptions={filterOptions}
        />
      </div>

      <section className="mt-4 rounded-[18px] border border-white/5 bg-panel/50 p-4">
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-heading">
          <Download size={16} className="text-accent" aria-hidden /> Izvoz podataka
        </h2>
        <p className="mt-1 text-[12px] text-muted">
          CSV za Excel ili Numbers: sigurnosna kopija ili vlastita analiza.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {/* Obični <a download>: odgovor je datoteka, ne stranica. */}
          <a
            href="/api/export?type=games"
            download
            className="rounded-[12px] border border-subtle/30 py-2.5 text-center text-[13px] font-bold text-soft"
          >
            Partije (.csv)
          </a>
          <a
            href="/api/export?type=rounds"
            download
            className="rounded-[12px] border border-subtle/30 py-2.5 text-center text-[13px] font-bold text-soft"
          >
            Sve ruke (.csv)
          </a>
        </div>
      </section>
    </main>
  );
}
