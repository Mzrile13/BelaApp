import Link from "next/link";
import { Trophy, Users } from "lucide-react";
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

        <Link
          href="/new-game"
          className="btn-gold mt-3 block rounded-xl px-3 py-3 text-center font-bold"
        >
          Nova partija
        </Link>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <Link
            href="/leaderboard"
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-emerald-600/30 bg-emerald-950/30 px-2 py-3 text-center active:bg-emerald-800/50"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="8" cy="8" r="4.2" stroke="#d9b567" strokeWidth="1.4" />
              <circle cx="14.5" cy="9.5" r="3.4" stroke="#8fa89b" strokeWidth="1.3" />
            </svg>
            <span className="text-xs font-semibold text-emerald-50">Igrači</span>
          </Link>
          <Link
            href="/leaderboard/pairs"
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-emerald-600/30 bg-emerald-950/30 px-2 py-3 text-center active:bg-emerald-800/50"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="8.5" cy="11" r="4.6" stroke="#d9b567" strokeWidth="1.4" />
              <circle cx="13.5" cy="11" r="4.6" stroke="#8fa89b" strokeWidth="1.3" />
            </svg>
            <span className="text-xs font-semibold text-emerald-50">Parovi</span>
          </Link>
          <Link
            href="/history"
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-emerald-600/30 bg-emerald-950/30 px-2 py-3 text-center active:bg-emerald-800/50"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="7.5" stroke="#d9b567" strokeWidth="1.4" />
              <path d="M11 6.5V11L14 13" stroke="#d9b567" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="text-xs font-semibold text-emerald-50">Povijest</span>
          </Link>
        </div>

        {activeGames.length > 0 ? (
          <Link
            href="/active-games"
            className="mt-2 block rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-3 text-center font-semibold text-amber-100 active:bg-amber-500/20 active:text-white"
          >
            Nastavi partiju &rarr;
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
