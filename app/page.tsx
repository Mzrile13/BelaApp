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
      <section className="glass-card rounded-[22px] px-5 py-[22px] shadow-[0_18px_36px_-18px_rgba(0,0,0,0.55)]">
        <h1 className="text-[26px] font-extrabold tracking-[-0.01em] text-[#f7fbf6]">
          Bela Tracker
        </h1>
        <p className="mt-1.5 mb-[18px] text-[13.5px] leading-[1.5] text-[#a9c2b3]">
          Live praćenje partija, ruku i naprednih statistika.
        </p>

        <Link
          href="/new-game"
          className="btn-gold block rounded-[16px] p-4 text-center text-[15px] font-bold"
        >
          Nova partija
        </Link>

        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <Link
            href="/leaderboard"
            className="rounded-[14px] border border-[rgba(169,194,179,0.22)] bg-[rgba(6,20,16,0.4)] px-1.5 py-3 text-center"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="mx-auto mb-1.5 block">
              <circle cx="8" cy="8" r="4.2" stroke="#d9b567" strokeWidth="1.4" />
              <circle cx="14.5" cy="9.5" r="3.4" stroke="#8fa89b" strokeWidth="1.3" />
            </svg>
            <span className="text-[11.5px] font-semibold text-[#dcece3]">Igrači</span>
          </Link>
          <Link
            href="/leaderboard/pairs"
            className="rounded-[14px] border border-[rgba(169,194,179,0.22)] bg-[rgba(6,20,16,0.4)] px-1.5 py-3 text-center"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="mx-auto mb-1.5 block">
              <circle cx="8.5" cy="11" r="4.6" stroke="#d9b567" strokeWidth="1.4" />
              <circle cx="13.5" cy="11" r="4.6" stroke="#8fa89b" strokeWidth="1.3" />
            </svg>
            <span className="text-[11.5px] font-semibold text-[#dcece3]">Parovi</span>
          </Link>
          <Link
            href="/history"
            className="rounded-[14px] border border-[rgba(169,194,179,0.22)] bg-[rgba(6,20,16,0.4)] px-1.5 py-3 text-center"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="mx-auto mb-1.5 block">
              <circle cx="11" cy="11" r="7.5" stroke="#d9b567" strokeWidth="1.4" />
              <path d="M11 6.5V11L14 13" stroke="#d9b567" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="text-[11.5px] font-semibold text-[#dcece3]">Povijest</span>
          </Link>
        </div>

        {activeGames.length > 0 ? (
          <Link
            href="/active-games"
            className="mt-2.5 block rounded-[14px] border border-[rgba(217,181,103,0.4)] bg-[rgba(217,181,103,0.10)] p-[13px] text-center text-[13.5px] font-semibold text-[#eef6ea]"
          >
            Nastavi partiju &rarr;
          </Link>
        ) : null}
      </section>

      <section className="card px-[18px] pt-[18px] pb-2">
        <h2 className="mb-3.5 flex items-center gap-2 text-[14.5px] font-bold text-[#f2f5f0]">
          <Trophy size={16} className="text-[#d9b567]" /> Top igrači
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

      <section className="card px-[18px] pt-[18px] pb-2">
        <h2 className="mb-3.5 flex items-center gap-2 text-[14.5px] font-bold text-[#f2f5f0]">
          <Users size={16} className="text-[#d9b567]" /> Najbolji parovi
        </h2>
        <div className="space-y-2.5">
          {pairStats.length === 0 ? (
            <p className="text-sm text-emerald-100/80">Nema dovoljno podataka za parove.</p>
          ) : (
            pairStats.map((pair) => (
              <div
                key={`${pair.playerAId}-${pair.playerBId}`}
                className="rounded-[14px] bg-[rgba(6,20,16,0.45)] px-3 py-[11px]"
              >
                <p className="text-[13px] font-bold text-[#f2f5f0]">
                  {pair.playerAUsername} + {pair.playerBUsername}
                </p>
                <p className="mt-[3px] text-[11.5px] text-[#8fa89b]">
                  Pobjede {pair.winsTogether}/{pair.gamesTogether} ·{" "}
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
