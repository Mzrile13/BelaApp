import Image from "next/image";
import Link from "next/link";
import { Info, Trophy, Users } from "lucide-react";
import { ProfileButton } from "@/components/ProfileButton";
import { PlayerSummaryCard } from "@/components/PlayerSummaryCard";
import { getGameScore, getWinningTeam, groupRoundsByGame } from "@/lib/scoring";
import { getAccountById } from "@/lib/accounts";
import { getCachedAllStats, getCachedDataset } from "@/lib/cachedStats";
import { requireAccountId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Home() {
  return <HomeContent />;
}

async function HomeContent() {
  const accountId = await requireAccountId();
  // Aktivne partije iz istog keširanog dataseta kao i statistika: prije su to
  // bila dva nekeširana upita u nizu (sve partije, pa ruke nezavršenih) na
  // svakom otvaranju naslovnice. Sve paralelno: statistika dijeli isto čitanje
  // dataseta (lib/cachedStats.ts).
  const [dataset, account, { players: playerStats, pairs: pairStatsAll }] = await Promise.all([
    getCachedDataset(accountId),
    getAccountById(accountId),
    getCachedAllStats(accountId),
  ]);
  const roundsByGameId = groupRoundsByGame(dataset.rounds);
  const activeGames = dataset.games.filter(
    (game) =>
      game.finishedAt === null &&
      getWinningTeam(getGameScore(roundsByGameId.get(game.id) ?? [])) === null,
  );
  // Naslovnica primjenjuje isti prag kao leaderboard, ali nema sekciju za
  // nedovoljan uzorak. Dok se ne kvalificiraju barem tri, pada natrag na puni
  // popis — inače bi nova grupa mjesecima gledala prazan blok.
  const qualifiedFirst = <T extends { provisional: boolean }>(rows: T[]) => {
    const qualified = rows.filter((row) => !row.provisional);
    return (qualified.length >= 3 ? qualified : rows).slice(0, 3);
  };
  const topPlayers = qualifiedFirst(playerStats.filter((row) => row.gamesPlayed > 0));
  const pairStats = qualifiedFirst(pairStatsAll);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 pb-20">
      <section className="glass-card rounded-[22px] px-5 py-[22px] shadow-[0_18px_36px_-18px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-accent/35 shadow-[0_6px_16px_-8px_rgba(0,0,0,0.6)]">
              <Image
                src="/logo.png"
                alt="Bela Tracker logo"
                width={44}
                height={44}
                priority
                className="h-full w-full object-contain"
              />
            </span>
            <h1 className="text-[26px] font-extrabold tracking-[-0.01em] text-heading">
              Bela Tracker
            </h1>
          </div>
          <ProfileButton username={account?.username ?? "Profil"} />
        </div>
        <p className="mt-1.5 text-[13.5px] leading-[1.5] text-subtle">
          Live praćenje partija, ruku i naprednih statistika.
        </p>

        {activeGames.length > 0 ? (
          <Link
            href="/active-games"
            className="mt-4 block rounded-[14px] border border-accent/40 bg-accent/10 p-[13px] text-center text-[13.5px] font-semibold text-ink"
          >
            Nastavi partiju &rarr;
          </Link>
        ) : null}
      </section>

      <section className="card px-[18px] pt-[18px] pb-2">
        <h2 className="mb-3.5 flex items-center gap-2 text-[14.5px] font-bold text-heading">
          <Trophy size={16} className="text-accent" /> Najbolji igrači
        </h2>
        <div className="space-y-3">
          {topPlayers.length === 0 ? (
            <p className="text-sm text-subtle">
              Još nema podataka. Dodaj igrače i pokreni prvu partiju.
            </p>
          ) : (
            topPlayers.map((stats) => (
              <Link key={stats.playerId} href={`/players/${stats.username}`} className="block rounded-[18px]">
                <PlayerSummaryCard stats={stats} />
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="card px-[18px] pt-[18px] pb-2">
        <h2 className="mb-3.5 flex items-center gap-2 text-[14.5px] font-bold text-heading">
          <Users size={16} className="text-accent" /> Najbolji parovi
        </h2>
        <div className="space-y-2.5">
          {pairStats.length === 0 ? (
            <p className="text-sm text-subtle">Nema dovoljno podataka za parove.</p>
          ) : (
            pairStats.map((pair) => (
              <Link
                key={`${pair.playerAId}-${pair.playerBId}`}
                href={`/pairs/${pair.playerAId}__${pair.playerBId}`}
                className="block rounded-[14px] bg-well/45 px-3 py-[11px]"
              >
                <p className="text-[13px] font-bold text-heading">
                  {pair.playerAUsername} + {pair.playerBUsername}
                </p>
                <p className="mt-[3px] text-[11.5px] text-muted">
                  Pobjede {pair.winsTogether}/{pair.gamesTogether} ·{" "}
                  {(pair.winRate * 100).toFixed(1)}%
                </p>
                <p className="mt-[3px] text-[11.5px] text-muted">
                  Kemija{" "}
                  <b
                    className={`font-semibold ${
                      pair.chemistry > 0.01
                        ? "text-accent"
                        : pair.chemistry < -0.01
                          ? "text-rose-300"
                          : "text-soft"
                    }`}
                  >
                    {pair.chemistry > 0 ? "+" : ""}
                    {(pair.chemistry * 100).toFixed(1)}%
                  </b>{" "}
                  · očekivano {(pair.expectedWinRate * 100).toFixed(0)}%
                </p>
              </Link>
            ))
          )}
        </div>
      </section>

      <Link
        href="/informacije"
        className="flex items-center justify-center gap-2 rounded-[16px] border border-subtle/22 bg-well/40 p-[15px] text-[13.5px] font-semibold text-soft"
      >
        <Info size={16} className="text-accent" />
        Informacije
      </Link>
    </main>
  );
}
