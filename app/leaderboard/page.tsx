import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { BackButton } from "@/components/BackButton";
import { getRepo } from "@/lib/supabase";
import { computePlayerStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function LeaderboardPage() {
  noStore();
  const repo = getRepo();
  const players = await repo.listPlayers();
  const games = await repo.listGames();
  const rounds = (await Promise.all(games.map((game) => repo.listRounds(game.id)))).flat();
  const leaderboard = computePlayerStats(players, games, rounds).filter(
    (row) => row.gamesPlayed > 0,
  );

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/" className="mb-3" />
      <section className="card p-4">
        <h1 className="text-xl font-bold text-white">Leaderboard</h1>
        <p className="text-sm text-emerald-100/90">
          MVP score uključuje učinak, caller uspješnost, partner impact i clutch.
        </p>
        <div className="mt-3 space-y-2">
          {leaderboard.length === 0 ? (
            <p className="rounded-xl bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100/90">
              Još nema završenih partija za leaderboard.
            </p>
          ) : (
            leaderboard.map((row, index) => (
              <Link
                key={row.playerId}
                href={`/players/${row.username}`}
                className="flex items-center justify-between rounded-xl bg-emerald-950/40 px-3 py-2"
              >
                <div>
                  <p className="font-medium text-white">
                    #{index + 1} {row.username}
                  </p>
                  <p className="text-xs text-emerald-200">
                    Win {row.gamesWon}/{row.gamesPlayed}{" "}
                    ({((row.gamesWon / Math.max(1, row.gamesPlayed)) * 100).toFixed(1)}%) ·{" "}
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
