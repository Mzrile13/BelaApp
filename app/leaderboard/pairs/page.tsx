import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { BackButton } from "@/components/BackButton";
import { getCachedPairStats } from "@/lib/cachedStats";
import type { PairStats } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function queryParamToString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function renderPairRow(row: PairStats, rank: number | null) {
  const muted = rank === null;
  const streakLabel =
    row.currentStreak > 0
      ? `W${row.currentStreak}`
      : row.currentStreak < 0
        ? `L${Math.abs(row.currentStreak)}`
        : "-";
  return (
    <Link
      key={`${row.playerAId}-${row.playerBId}`}
      href={`/pairs/${row.playerAId}__${row.playerBId}`}
      className={`flex items-center justify-between rounded-[14px] px-3.5 py-3 ${
        muted ? "bg-[rgba(6,20,16,0.28)]" : "bg-[rgba(6,20,16,0.45)]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold ${
            muted
              ? "bg-[rgba(169,194,179,0.18)] text-[#8fa89b]"
              : "bg-[#c9d9a0] text-[#10261c]"
          }`}
        >
          {muted ? "·" : rank}
        </span>
        <div>
          <p className="text-[13.5px] font-bold text-[#f2f5f0]">
            {row.playerAUsername} + {row.playerBUsername}
          </p>
          <p className="mt-px text-[11.5px] text-[#8fa89b]">
            Win {row.winsTogether}/{row.gamesTogether} ({(row.winRate * 100).toFixed(1)}%) ·{" "}
            {streakLabel}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-bold text-[#c9d9a0]">MVP {row.mvpScore}</p>
        {muted ? <p className="text-[10px] text-[#8fa89b]">premalo partija</p> : null}
      </div>
    </Link>
  );
}

export default async function PairLeaderboardPage(props: PageProps<"/leaderboard/pairs">) {
  noStore();
  const searchParams = await props.searchParams;
  const queryRaw = queryParamToString(searchParams?.q);
  const query = queryRaw.toLowerCase().trim();

  const leaderboard = (await getCachedPairStats()).filter((row) => {
    if (!query) return true;
    const label = `${row.playerAUsername} ${row.playerBUsername}`.toLowerCase();
    return label.includes(query);
  });
  const ranked = leaderboard.filter((row) => !row.insufficientSample);
  const insufficient = leaderboard.filter((row) => row.insufficientSample);

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/" className="mb-3" />
      <h1 className="mb-3.5 text-[20px] font-extrabold text-[#f7fbf6]">Leaderboard</h1>

      <div className="mb-3.5 flex gap-1.5 rounded-[12px] border border-[rgba(255,255,255,0.05)] bg-[rgba(6,20,16,0.5)] p-1">
        <Link
          href="/leaderboard"
          className="flex-1 rounded-[9px] py-[9px] text-center text-[12.5px] font-bold text-[#a9c2b3]"
        >
          Igrači
        </Link>
        <span className="flex-1 rounded-[9px] bg-[#c9d9a0] py-[9px] text-center text-[12.5px] font-bold text-[#10261c]">
          Parovi
        </span>
      </div>

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
          ranked.map((row, index) => renderPairRow(row, index + 1))
        )}

        {insufficient.length > 0 ? (
          <>
            <div className="flex items-center gap-2 pt-3 pb-0.5">
              <span className="h-px flex-1 bg-[rgba(255,255,255,0.08)]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#8fa89b]">
                Nedovoljno odigranih partija
              </span>
              <span className="h-px flex-1 bg-[rgba(255,255,255,0.08)]" />
            </div>
            {insufficient.map((row) => renderPairRow(row, null))}
          </>
        ) : null}
      </div>
    </main>
  );
}
