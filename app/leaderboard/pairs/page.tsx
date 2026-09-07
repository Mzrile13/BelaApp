import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { BackButton } from "@/components/BackButton";
import { LeaderboardTabs } from "@/components/LeaderboardTabs";
import { getCachedPairStats } from "@/lib/cachedStats";
import { requireAccountId } from "@/lib/session";
import type { PairStats } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function queryParamToString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatChemistry(value: number) {
  const pct = value * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function renderPairRow(row: PairStats, rank: number) {
  const chemistryClass =
    row.chemistry > 0.01
      ? "text-[#c9d9a0]"
      : row.chemistry < -0.01
        ? "text-rose-300"
        : "text-[#dcece3]";

  return (
    <Link
      key={`${row.playerAId}-${row.playerBId}`}
      href={`/pairs/${row.playerAId}__${row.playerBId}`}
      className={`flex items-center justify-between rounded-[14px] px-3.5 py-3 ${
        row.provisional ? "bg-[rgba(6,20,16,0.28)]" : "bg-[rgba(6,20,16,0.45)]"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold ${
            row.provisional
              ? "bg-[rgba(169,194,179,0.18)] text-[#8fa89b]"
              : "bg-[#c9d9a0] text-[#10261c]"
          }`}
        >
          {rank}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-bold text-[#f2f5f0]">
            {row.playerAUsername} + {row.playerBUsername}
          </p>
          <p className="mt-px truncate text-[11.5px] text-[#8fa89b]">
            {(row.winRate * 100).toFixed(0)}% stvarno · {(row.expectedWinRate * 100).toFixed(0)}%
            očekivano · {row.gamesTogether} partija
          </p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-[14px] font-extrabold ${chemistryClass}`}>
          {formatChemistry(row.chemistry)}
        </p>
        <p className="text-[10.5px] text-[#8fa89b]">kemija</p>
      </div>
    </Link>
  );
}

export default async function PairLeaderboardPage(props: PageProps<"/leaderboard/pairs">) {
  noStore();
  const searchParams = await props.searchParams;
  const queryRaw = queryParamToString(searchParams?.q);
  const query = queryRaw.toLowerCase().trim();

  const leaderboard = (await getCachedPairStats(await requireAccountId())).filter((row) => {
    if (!query) return true;
    const label = `${row.playerAUsername} ${row.playerBUsername}`.toLowerCase();
    return label.includes(query);
  });

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/" className="mb-3" />
      <h1 className="mb-3.5 text-[20px] font-extrabold text-[#f7fbf6]">Leaderboard</h1>

      <LeaderboardTabs active="/leaderboard/pairs" />

      <form method="GET" className="mb-3.5">
        <input
          type="search"
          name="q"
          defaultValue={queryRaw}
          placeholder="Pretraži par (username)..."
          className="w-full rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(6,20,16,0.4)] px-3 py-2 text-[#eef3ee] placeholder:text-[#8fa89b]"
        />
      </form>

      <div className="space-y-2">
        {leaderboard.length === 0 ? (
          <p className="rounded-xl bg-[rgba(6,20,16,0.4)] px-3 py-2 text-sm text-[#a9c2b3]">
            Nema podataka za parove.
          </p>
        ) : (
          leaderboard.map((row, index) => renderPairRow(row, index + 1))
        )}
      </div>

      <p className="mt-3.5 px-1 text-[11px] leading-relaxed text-[#8fa89b]">
        Parovi se rangiraju po kemiji, a ne po broju pobjeda — inače bi par dvojice
        najboljih igrača uvijek vodio, što već znaš iz liste igrača. Kemija je razlika
        između stvarnog i očekivanog postotka pobjeda, gdje očekivani dolazi iz
        pojedinačnih rejtinga te dvojice protiv stvarnih protivnika. Plus znači da
        zajedno igraju bolje nego što su im rejtinzi.
      </p>
    </main>
  );
}
