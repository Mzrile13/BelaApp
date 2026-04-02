import Link from "next/link";
import { History, Trophy, Users } from "lucide-react";
import { PlayerStatsCard } from "@/components/PlayerStatsCard";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { getRepo } from "@/lib/supabase";
import { computePairStats, computePlayerStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Home() {
  return <HomeContent />;
}

async function HomeContent() {
  const repo = getRepo();
  const players = await repo.listPlayers();
  const games = await repo.listGames();
  const roundsByGame = await Promise.all(games.map((game) => repo.listRounds(game.id)));
  const activeGames = games.filter((game, index) => {
    if (game.finishedAt !== null) return false;
    const winner = getWinningTeam(getGameScore(roundsByGame[index] ?? []));
    return winner === null;
  });
  const rounds = roundsByGame.flat();
  const playerStats = computePlayerStats(players, games, rounds);
  const pairStats = computePairStats(players, games, rounds).slice(0, 3);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 pb-20">
      <section className="card p-4">
        <h1 className="text-2xl font-bold text-white">Bela Tracker</h1>
        <p className="text-sm text-emerald-100/90">
          Live praćenje partija, ruku i naprednih statistika.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <Link
            href="/new-game"
            className="rounded-xl bg-emerald-700 px-3 py-3 text-center font-semibold text-emerald-50 active:bg-emerald-800 active:text-white"
          >
            Nova partija
          </Link>
          <Link
            href="/leaderboard"
            className="rounded-xl border border-emerald-500 px-3 py-3 text-center font-semibold text-emerald-50 active:bg-emerald-800/60 active:text-white"
          >
            Igrači
          </Link>
          <Link
            href="/leaderboard/pairs"
            className="rounded-xl border border-emerald-500 px-3 py-3 text-center font-semibold text-emerald-50 active:bg-emerald-800/60 active:text-white"
          >
            Parovi
          </Link>
          <Link
            href="/history"
            className="rounded-xl border border-emerald-500 px-3 py-3 text-center font-semibold text-emerald-50 active:bg-emerald-800/60 active:text-white"
          >
            <span className="inline-flex items-center gap-2">
              <History size={16} />
              Povijest partija
            </span>
          </Link>
        </div>
        {activeGames.length > 0 ? (
          <Link
            href="/active-games"
            className="mt-2 block rounded-xl border border-lime-300/70 bg-lime-500/20 px-3 py-3 text-center font-semibold text-lime-100 active:bg-lime-500/35 active:text-white"
          >
            Nastavi partiju
          </Link>
        ) : null}
      </section>

      <section className="card p-4">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
          <Trophy size={18} /> Top igrači
        </h2>
        <div className="space-y-3">
          {playerStats.length === 0 ? (
            <p className="text-sm text-emerald-100/80">
              Još nema podataka. Dodaj igrače i pokreni prvu partiju.
            </p>
          ) : (
            playerStats.slice(0, 3).map((stats) => (
              <PlayerStatsCard key={stats.playerId} stats={stats} />
            ))
          )}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
          <Users size={18} /> Najbolji parovi
        </h2>
        <div className="space-y-2 text-sm text-emerald-100">
          {pairStats.length === 0 ? (
            <p>Nema dovoljno podataka za parove.</p>
          ) : (
            pairStats.map((pair) => (
              <div key={`${pair.playerAId}-${pair.playerBId}`} className="rounded-xl bg-emerald-950/40 p-3">
                <p className="font-medium">
                  {pair.playerAUsername} + {pair.playerBUsername}
                </p>
                <p className="text-emerald-200">
                  Pobjede {pair.winsTogether}/{pair.gamesTogether} · Win rate{" "}
                  {(pair.winRate * 100).toFixed(1)}%
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
