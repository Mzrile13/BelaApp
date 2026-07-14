import Image from "next/image";
import Link from "next/link";
import { Trophy, Users } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { PlayerStatsCard } from "@/components/PlayerStatsCard";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { getRepo } from "@/lib/supabase";
import { getCachedPairStats, getCachedPlayerStats } from "@/lib/cachedStats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Home() {
  return <HomeContent />;
}

async function HomeContent() {
  const repo = getRepo();
  const games = await repo.listGames();
  // Only unfinished games can be active; load rounds just for those instead of
  // scanning every round in the database.
  const unfinishedGames = games.filter((game) => game.finishedAt === null);
  const unfinishedRounds = unfinishedGames.length
    ? await repo.listRoundsForGames(unfinishedGames.map((game) => game.id))
    : [];
  const roundsByGameId = new Map<string, typeof unfinishedRounds>();
  for (const round of unfinishedRounds) {
    const bucket = roundsByGameId.get(round.gameId) ?? [];
    bucket.push(round);
    roundsByGameId.set(round.gameId, bucket);
  }
  const activeGames = unfinishedGames.filter(
    (game) => getWinningTeam(getGameScore(roundsByGameId.get(game.id) ?? [])) === null,
  );
  const [playerStats, pairStatsAll] = await Promise.all([
    getCachedPlayerStats(),
    getCachedPairStats(),
  ]);
  const pairStats = pairStatsAll.slice(0, 3);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 pb-20">
      <section className="glass-card rounded-[22px] px-5 py-[22px] shadow-[0_18px_36px_-18px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[rgba(201,217,160,0.35)] shadow-[0_6px_16px_-8px_rgba(0,0,0,0.6)]">
              <Image
                src="/logo.png"
                alt="Bela Tracker logo"
                width={44}
                height={44}
                priority
                className="h-full w-full object-contain"
              />
            </span>
            <h1 className="text-[26px] font-extrabold tracking-[-0.01em] text-[#f7fbf6]">
              Bela Tracker
            </h1>
          </div>
          <LogoutButton />
        </div>
        <p className="mt-1.5 mb-[18px] text-[13.5px] leading-[1.5] text-[#a9c2b3]">
          Live praćenje partija, ruku i naprednih statistika.
        </p>

        <Link
          href="/new-game"
          className="btn-accent block rounded-[16px] p-4 text-center text-[15px] font-bold"
        >
          Nova partija
        </Link>

        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <Link
            href="/leaderboard"
            className="rounded-[14px] border border-[rgba(169,194,179,0.22)] bg-[rgba(6,20,16,0.4)] px-1.5 py-3 text-center"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="mx-auto mb-1.5 block">
              <circle cx="8" cy="8" r="4.2" stroke="#c9d9a0" strokeWidth="1.4" />
              <circle cx="14.5" cy="9.5" r="3.4" stroke="#8fa89b" strokeWidth="1.3" />
            </svg>
            <span className="text-[11.5px] font-semibold text-[#dcece3]">Igrači</span>
          </Link>
          <Link
            href="/leaderboard/pairs"
            className="rounded-[14px] border border-[rgba(169,194,179,0.22)] bg-[rgba(6,20,16,0.4)] px-1.5 py-3 text-center"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="mx-auto mb-1.5 block">
              <circle cx="8.5" cy="11" r="4.6" stroke="#c9d9a0" strokeWidth="1.4" />
              <circle cx="13.5" cy="11" r="4.6" stroke="#8fa89b" strokeWidth="1.3" />
            </svg>
            <span className="text-[11.5px] font-semibold text-[#dcece3]">Parovi</span>
          </Link>
          <Link
            href="/history"
            className="rounded-[14px] border border-[rgba(169,194,179,0.22)] bg-[rgba(6,20,16,0.4)] px-1.5 py-3 text-center"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="mx-auto mb-1.5 block">
              <circle cx="11" cy="11" r="7.5" stroke="#c9d9a0" strokeWidth="1.4" />
              <path d="M11 6.5V11L14 13" stroke="#c9d9a0" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="text-[11.5px] font-semibold text-[#dcece3]">Povijest</span>
          </Link>
        </div>

        {activeGames.length > 0 ? (
          <Link
            href="/active-games"
            className="mt-2.5 block rounded-[14px] border border-[rgba(201,217,160,0.4)] bg-[rgba(201,217,160,0.10)] p-[13px] text-center text-[13.5px] font-semibold text-[#eef6ea]"
          >
            Nastavi partiju &rarr;
          </Link>
        ) : null}
      </section>

      <section className="card px-[18px] pt-[18px] pb-2">
        <h2 className="mb-3.5 flex items-center gap-2 text-[14.5px] font-bold text-[#f2f5f0]">
          <Trophy size={16} className="text-[#c9d9a0]" /> Top igrači
        </h2>
        <div className="space-y-3">
          {playerStats.length === 0 ? (
            <p className="text-sm text-[#a9c2b3]">
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
          <Users size={16} className="text-[#c9d9a0]" /> Najbolji parovi
        </h2>
        <div className="space-y-2.5">
          {pairStats.length === 0 ? (
            <p className="text-sm text-[#a9c2b3]">Nema dovoljno podataka za parove.</p>
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
