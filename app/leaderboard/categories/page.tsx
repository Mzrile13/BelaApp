import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { BackButton } from "@/components/BackButton";
import { CategoryBoard, type CategoryEntry } from "@/components/CategoryBoard";
import { LeaderboardTabs } from "@/components/LeaderboardTabs";
import { getCachedAllStats } from "@/lib/cachedStats";
import { requireAccountId } from "@/lib/session";
import type { PairStats, PlayerStats } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const MVP_MIN_GAMES = 5;
const FORM_MIN_GAMES = 3;
const CALL_MIN_CALLS = 10;
const ROUND_MIN_ROUNDS = 30;
const CLUTCH_MIN_ROUNDS = 8;
const CHEMISTRY_MIN_GAMES = 4;

function signed(value: number, digits = 0) {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

/** Gradi jednu kategoriju: filtar uzorka, sortiranje, formatiranje. */
function playerBoard(
  rows: PlayerStats[],
  eligible: (row: PlayerStats) => boolean,
  rank: (row: PlayerStats) => number,
  format: (row: PlayerStats) => string,
  hint?: (row: PlayerStats) => string,
): CategoryEntry[] {
  return rows
    .filter(eligible)
    .sort((a, b) => rank(b) - rank(a))
    .map((row) => ({
      key: row.playerId,
      label: row.username,
      value: format(row),
      hint: hint?.(row),
      href: `/players/${row.username}`,
    }));
}

function pairLabel(row: PairStats) {
  return `${row.playerAUsername} + ${row.playerBUsername}`;
}

export default async function CategoriesPage() {
  noStore();
  const { players, pairs, season } = await getCachedAllStats(await requireAccountId());
  const played = players.filter((row) => row.gamesPlayed > 0);

  const seasonBoard = playerBoard(
    played,
    (row) => row.gamesPlayed >= MVP_MIN_GAMES,
    (row) => row.seasonDelta,
    (row) => signed(row.seasonDelta),
    (row) => `${row.gamesPlayed} partija`,
  );
  const mvp = seasonBoard[0] ?? null;

  const chemistryPairs = pairs.filter((row) => row.gamesTogether >= CHEMISTRY_MIN_GAMES);

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/" className="mb-3" />
      <h1 className="mb-3.5 text-[20px] font-extrabold text-[#f7fbf6]">Leaderboard</h1>

      <LeaderboardTabs active="/leaderboard/categories" />

      <section className="mb-3 rounded-[18px] border border-[rgba(201,217,160,0.25)] bg-[rgba(201,217,160,0.08)] p-4">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#c9d9a0]">
          MVP sezone {season ?? ""}
        </p>
        {mvp ? (
          <>
            <Link
              href={mvp.href ?? "/leaderboard"}
              className="mt-1 block text-[22px] font-extrabold text-[#f7fbf6]"
            >
              {mvp.label}
            </Link>
            <p className="mt-0.5 text-[12px] text-[#a9c2b3]">
              {mvp.value} rejtinga u sezoni · {mvp.hint}
            </p>
          </>
        ) : (
          <p className="mt-1 text-[13px] text-[#a9c2b3]">
            Još nitko nije odigrao {MVP_MIN_GAMES} partija ove sezone.
          </p>
        )}
        <p className="mt-2 text-[10.5px] leading-snug text-[#8fa89b]">
          Nagrada za najveći napredak, ne mjera snage — za snagu služi rejting na kartici
          Igrači.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <CategoryBoard
          title="Uspon sezone"
          description={`Promjena rejtinga u sezoni ${season ?? ""}. Minimalno ${MVP_MIN_GAMES} partija.`}
          entries={seasonBoard}
        />

        <CategoryBoard
          title="Forma"
          description="Promjena rejtinga kroz zadnjih 10 partija."
          entries={playerBoard(
            played,
            (row) => row.gamesPlayed >= FORM_MIN_GAMES,
            (row) => row.formDelta,
            (row) => signed(row.formDelta),
            (row) => (row.trend === "hot" ? "u naletu" : row.trend === "cold" ? "u padu" : ""),
          )}
        />

        <CategoryBoard
          title="Zvanje aduta"
          description={`Bodovi razlike iznad ligaškog prosjeka, po partiji. Iz volje i na mus mjere se protiv vlastite osnovice. Min. ${CALL_MIN_CALLS} zvanja.`}
          entries={playerBoard(
            played,
            (row) => row.timesCalled >= CALL_MIN_CALLS,
            (row) => row.callValueAdded,
            (row) => signed(row.callValueAdded, 1),
            (row) => `${row.timesCalled} zvanja`,
          )}
        />

        <CategoryBoard
          title="Hrabrost"
          description={`Koliko često zove kad nije na musu (djelitelj je uvijek na musu). Min. ${ROUND_MIN_ROUNDS} ruku.`}
          entries={playerBoard(
            played,
            (row) => row.roundsPlayed >= ROUND_MIN_ROUNDS,
            (row) => row.voluntaryCallRate,
            (row) => `${(row.voluntaryCallRate * 100).toFixed(1)}%`,
            (row) => `${(row.voluntaryCallerSuccessRate * 100).toFixed(0)}% prolaz`,
          )}
        />

        <CategoryBoard
          title="Zvanja"
          description="Prosjek vlastitih zvanja po partiji."
          entries={playerBoard(
            played,
            (row) => row.gamesPlayed >= FORM_MIN_GAMES,
            (row) => row.avgZvanja,
            (row) => row.avgZvanja.toFixed(1),
            (row) => `${row.zvanjaTotal} ukupno`,
          )}
        />

        <CategoryBoard
          title="Štiglja"
          description="Prosjek štiglji po partiji."
          entries={playerBoard(
            played,
            (row) => row.gamesPlayed >= FORM_MIN_GAMES,
            (row) => row.stigliaCount / Math.max(1, row.gamesPlayed),
            (row) => (row.stigliaCount / Math.max(1, row.gamesPlayed)).toFixed(2),
            (row) => `${row.stigliaCount} ukupno`,
          )}
        />

        <CategoryBoard
          title="Završnica"
          description={`Dobivene ruke kad je netko blizu 1001, a razlika je još nadoknadiva. Min. ${CLUTCH_MIN_ROUNDS} takvih ruku.`}
          entries={playerBoard(
            played,
            (row) => row.clutchRounds >= CLUTCH_MIN_ROUNDS,
            (row) => row.clutchIndex,
            (row) => `${(row.clutchIndex * 100).toFixed(0)}%`,
            (row) => `${row.clutchRounds} ruku`,
          )}
        />

        <CategoryBoard
          title="Stabilnost"
          description={`Najmanje rasipanje bodova po ruci. Min. ${ROUND_MIN_ROUNDS} ruku.`}
          entries={playerBoard(
            played,
            (row) => row.roundsPlayed >= ROUND_MIN_ROUNDS,
            (row) => -row.consistencyIndex,
            (row) => row.consistencyIndex.toFixed(1),
            (row) => `⌀ ${row.avgPoints.toFixed(0)}`,
          )}
        />

        <CategoryBoard
          title="Preokret"
          description="Najveći nadoknađeni zaostatak unutar jedne partije."
          entries={playerBoard(
            played,
            (row) => row.gamesPlayed > 0,
            (row) => row.biggestComeback,
            (row) => row.biggestComeback.toFixed(0),
          )}
        />

        <CategoryBoard
          title="Kemija"
          description={`Parovi koji igraju iznad zbroja svojih rejtinga. Min. ${CHEMISTRY_MIN_GAMES} zajedničkih partija.`}
          entries={chemistryPairs
            .slice()
            .sort((a, b) => b.chemistry - a.chemistry)
            .map((row) => ({
              key: `${row.playerAId}-${row.playerBId}`,
              label: pairLabel(row),
              value: `${signed(row.chemistry * 100, 1)}%`,
              hint: `${row.gamesTogether} partija`,
              href: `/pairs/${row.playerAId}__${row.playerBId}`,
            }))}
        />

        <CategoryBoard
          title="Neslaganje"
          description={`Parovi koji igraju ispod zbroja svojih rejtinga. Min. ${CHEMISTRY_MIN_GAMES} zajedničkih partija.`}
          entries={chemistryPairs
            .slice()
            .sort((a, b) => a.chemistry - b.chemistry)
            .map((row) => ({
              key: `${row.playerAId}-${row.playerBId}`,
              label: pairLabel(row),
              value: `${signed(row.chemistry * 100, 1)}%`,
              hint: `${row.gamesTogether} partija`,
              href: `/pairs/${row.playerAId}__${row.playerBId}`,
            }))}
        />

        <CategoryBoard
          title="Rivalstva"
          description="Protivnik protiv kojeg igrač najviše podbacuje u odnosu na očekivano."
          entries={played
            .filter((row) => row.nemesisUsername !== null && row.nemesisDelta < 0)
            .sort((a, b) => a.nemesisDelta - b.nemesisDelta)
            .map((row) => ({
              key: row.playerId,
              label: `${row.username} → ${row.nemesisUsername}`,
              value: `${(row.nemesisDelta * 100).toFixed(0)}%`,
              href: `/players/${row.username}`,
            }))}
        />
      </div>
    </main>
  );
}
