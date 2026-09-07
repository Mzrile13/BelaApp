import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { BackButton } from "@/components/BackButton";
import { LeaderboardTabs } from "@/components/LeaderboardTabs";
import { RatingSparkline } from "@/components/RatingSparkline";
import { getCachedPlayerStats } from "@/lib/cachedStats";
import { requireAccountId } from "@/lib/session";
import type { PlayerStats } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function queryParamToString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatDelta(value: number) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

function renderPlayerRow(row: PlayerStats, rank: number | null) {
  const muted = rank === null;
  const streakLabel =
    row.currentStreak > 0
      ? `W${row.currentStreak}`
      : row.currentStreak < 0
        ? `L${Math.abs(row.currentStreak)}`
        : "-";
  const deltaClass =
    row.formDelta > 0
      ? "text-[#c9d9a0]"
      : row.formDelta < 0
        ? "text-rose-300"
        : "text-[#8fa89b]";

  return (
    <Link
      key={row.playerId}
      href={`/players/${row.username}`}
      className={`flex items-center justify-between rounded-[14px] px-3.5 py-3 ${
        muted ? "bg-[rgba(6,20,16,0.28)]" : "bg-[rgba(6,20,16,0.45)]"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold ${
            muted
              ? "bg-[rgba(169,194,179,0.18)] text-[#8fa89b]"
              : "bg-[#c9d9a0] text-[#10261c]"
          }`}
        >
          {muted ? "·" : rank}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-bold text-[#f2f5f0]">{row.username}</p>
          <p className="mt-px truncate text-[11.5px] text-[#8fa89b]">
            {row.gamesWon}W / {Math.max(0, row.gamesPlayed - row.gamesWon)}L (
            {((row.gamesWon / Math.max(1, row.gamesPlayed)) * 100).toFixed(0)}%) · {streakLabel}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <RatingSparkline values={row.ratingTrail} />
        <div className="text-right">
          <p className="text-[14px] font-extrabold text-[#c9d9a0]">{Math.round(row.rating)}</p>
          <p className={`text-[10.5px] font-semibold ${deltaClass}`}>
            {formatDelta(row.formDelta)} · ±{Math.round(row.sigma)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default async function LeaderboardPage(props: PageProps<"/leaderboard">) {
  noStore();
  const searchParams = await props.searchParams;
  const queryRaw = queryParamToString(searchParams?.q);
  const query = queryRaw.toLowerCase().trim();
  const leaderboard = (await getCachedPlayerStats(await requireAccountId()))
    .filter((row) => row.gamesPlayed > 0)
    .filter((row) => (query ? row.username.toLowerCase().includes(query) : true));
  const ranked = leaderboard.filter((row) => !row.provisional);
  const insufficient = leaderboard.filter((row) => row.provisional);

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/" className="mb-3" />
      <h1 className="mb-3.5 text-[20px] font-extrabold text-[#f7fbf6]">Leaderboard</h1>

      <LeaderboardTabs active="/leaderboard" />

      <form method="GET" className="mb-3.5">
        <input
          type="search"
          name="q"
          defaultValue={queryRaw}
          placeholder="Pretraži igrača..."
          className="w-full rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(6,20,16,0.4)] px-3 py-2 text-[#eef3ee] placeholder:text-[#8fa89b]"
        />
      </form>

      <div className="space-y-2">
        {leaderboard.length === 0 ? (
          <p className="rounded-xl bg-[rgba(6,20,16,0.4)] px-3 py-2 text-sm text-[#a9c2b3]">
            Još nema završenih partija za leaderboard.
          </p>
        ) : (
          ranked.map((row, index) => renderPlayerRow(row, index + 1))
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
            {insufficient.map((row) => renderPlayerRow(row, null))}
          </>
        ) : null}
      </div>

      <p className="mt-3.5 px-1 text-[11px] leading-relaxed text-[#8fa89b]">
        Rejting je ekipni Elo: korigiran je na jačinu partnera i protivnika, a razlika u
        rezultatu utječe na veličinu promjene. Poredak ide po rejtingu umanjenom za
        nesigurnost (±). Za ulazak u poredak treba 15 odigranih partija.
      </p>
    </main>
  );
}
