import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { BackButton } from "@/components/BackButton";
import { PairStatsCard } from "@/components/PairStatsCard";
import { getRepo } from "@/lib/supabase";
import { computePairStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function queryParamToString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function PairLeaderboardPage(props: PageProps<"/leaderboard/pairs">) {
  noStore();
  const searchParams = await props.searchParams;
  const queryRaw = queryParamToString(searchParams?.q);
  const query = queryRaw.toLowerCase().trim();
  const repo = getRepo();
  const players = await repo.listPlayers();
  const games = await repo.listGames();
  const rounds = (await Promise.all(games.map((game) => repo.listRounds(game.id)))).flat();

  const leaderboard = computePairStats(players, games, rounds).filter((row) => {
    if (!query) return true;
    const label = `${row.playerAUsername} ${row.playerBUsername}`.toLowerCase();
    return label.includes(query);
  });

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
        <span className="flex-1 rounded-[9px] bg-[#d9b567] py-[9px] text-center text-[12.5px] font-bold text-[#10261c]">
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

      <div className="space-y-3">
        {leaderboard.length === 0 ? (
          <p className="rounded-xl bg-[rgba(6,20,16,0.4)] px-3 py-2 text-sm text-[#a9c2b3]">
            Nema podataka za parove.
          </p>
        ) : (
          leaderboard.map((row) => (
            <Link
              key={`${row.playerAId}-${row.playerBId}`}
              href={`/pairs/${row.playerAId}__${row.playerBId}`}
              className="block"
            >
              <PairStatsCard stats={row} />
              {row.insufficientSample ? (
                <p className="mt-1 text-xs text-[#d9b567]">insufficient sample</p>
              ) : null}
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
