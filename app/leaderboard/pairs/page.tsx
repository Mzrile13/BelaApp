import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { BackButton } from "@/components/BackButton";
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
      <section className="card p-4">
        <h1 className="text-xl font-bold text-white">Leaderboard parova</h1>
        <p className="text-sm text-emerald-100/90">
          MVP score uključuje učinak para, win rate, caller uspješnost i clutch.
        </p>
        <form method="GET" className="mt-3">
          <input
            type="search"
            name="q"
            defaultValue={queryRaw}
            placeholder="Pretraži par (username)..."
            className="w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50 placeholder:text-emerald-300/70"
          />
        </form>
        <div className="mt-3 space-y-2">
          {leaderboard.length === 0 ? (
            <p className="rounded-xl bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100/90">
              Nema podataka za parove.
            </p>
          ) : (
            leaderboard.map((row, index) => (
              <Link
                key={`${row.playerAId}-${row.playerBId}`}
                href={`/pairs/${row.playerAId}__${row.playerBId}`}
                className="flex items-center justify-between rounded-xl bg-emerald-950/40 px-3 py-2"
              >
                <div>
                  <p className="font-medium text-white">
                    #{index + 1} {row.playerAUsername} + {row.playerBUsername}
                  </p>
                  <p className="text-xs text-emerald-200">
                    Win {row.winsTogether}/{row.gamesTogether} ({(row.winRate * 100).toFixed(1)}%) ·{" "}
                    {row.currentStreak > 0
                      ? `W${row.currentStreak}`
                      : row.currentStreak < 0
                        ? `L${Math.abs(row.currentStreak)}`
                        : "-"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-lime-300">MVP {row.mvpScore}</p>
                  {row.insufficientSample ? (
                    <p className="text-xs text-amber-300">insufficient sample</p>
                  ) : null}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
