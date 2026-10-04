import Link from "next/link";
import { Crown, Flame, Trophy, Users } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { MVP_MIN_GAMES, PAIR_CHAMPION_MIN_GAMES, seasonSlug, type SeasonSummary } from "@/lib/season";

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function SeasonSwitcher({
  seasons,
  active,
  current,
}: {
  seasons: string[];
  active: string;
  current: string;
}) {
  // Najnovija prva; trenutna (i otvorena) sezona je uvijek na popisu, i bez partija.
  const list = Array.from(new Set([current, active, ...seasons])).sort().reverse();
  return (
    <nav aria-label="Sezone" className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4">
      {list.map((season) => (
        <Link
          key={season}
          href={`/sezona/${seasonSlug(season)}`}
          aria-current={season === active ? "page" : undefined}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-bold ${
            season === active
              ? "border-accent/70 bg-accent/14 text-accent"
              : "border-subtle/20 bg-well/40 text-muted"
          }`}
        >
          {season}
        </Link>
      ))}
    </nav>
  );
}

function AwardCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-accent/25 bg-accent/8 p-4">
      <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-accent">
        {icon}
        {label}
      </p>
      {children}
    </section>
  );
}

export function SeasonView({ summary }: { summary: SeasonSummary }) {
  const { mvp, pairChampion, biggestWin } = summary;
  const usernameById = new Map(summary.players.map((row) => [row.playerId, row.username]));
  const standings = summary.players.filter((row) => row.games >= MVP_MIN_GAMES);

  if (summary.games === 0) {
    return (
      <p className="rounded-[18px] border border-white/5 bg-panel/50 p-4 text-[14px] text-subtle">
        U sezoni {summary.season} još nema završenih partija.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Partija", summary.games],
          ["Ruku", summary.rounds],
          ["Štiglji", summary.stigliaCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[14px] bg-well/45 px-3 py-2.5 text-center">
            <p className="font-mono text-[20px] font-extrabold text-heading">{value}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <AwardCard icon={<Crown size={14} aria-hidden />} label="MVP sezone">
          {mvp ? (
            <>
              <Link
                href={`/players/${mvp.username}`}
                className="mt-1.5 flex items-center gap-2 text-[20px] font-extrabold text-heading"
              >
                <PlayerAvatar id={mvp.playerId} name={mvp.username} size="md" />
                {mvp.username}
              </Link>
              <p className="mt-1 text-[12px] text-subtle">
                {signed(mvp.delta)} rejtinga · {mvp.wins}/{mvp.games} pobjeda
              </p>
            </>
          ) : (
            <p className="mt-1 text-[13px] text-subtle">
              Nitko još nema {MVP_MIN_GAMES} partija u ovoj sezoni.
            </p>
          )}
        </AwardCard>

        <AwardCard icon={<Users size={14} aria-hidden />} label="Par sezone">
          {pairChampion ? (
            <>
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[18px] font-extrabold text-heading">
                <PlayerAvatar id={pairChampion.playerAId} name={pairChampion.playerAUsername} size="sm" />
                {pairChampion.playerAUsername}
                <span className="text-dim">+</span>
                <PlayerAvatar id={pairChampion.playerBId} name={pairChampion.playerBUsername} size="sm" />
                {pairChampion.playerBUsername}
              </p>
              <p className="mt-1 text-[12px] text-subtle">
                {percent(pairChampion.winRate)} pobjeda · {pairChampion.wins}/{pairChampion.games} partija
              </p>
            </>
          ) : (
            <p className="mt-1 text-[13px] text-subtle">
              Nijedan par nema {PAIR_CHAMPION_MIN_GAMES} zajedničke partije.
            </p>
          )}
        </AwardCard>
      </div>

      {biggestWin ? (
        <Link
          href={`/game/${biggestWin.gameId}?from=history`}
          className="flex items-center gap-3 rounded-[14px] bg-well/45 px-3.5 py-3"
        >
          <Flame size={18} className="shrink-0 text-warn" aria-hidden />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-muted">
              Najuvjerljivija pobjeda
            </p>
            <p className="truncate text-[13.5px] font-bold text-heading">
              {biggestWin.winnerIds.map((id) => usernameById.get(id) ?? "?").join(" + ")} ·{" "}
              {biggestWin.scoreA}:{biggestWin.scoreB} (razlika {biggestWin.margin})
            </p>
          </div>
        </Link>
      ) : null}

      <section className="rounded-[18px] border border-white/5 bg-panel/50 p-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-[15px] font-bold text-heading">
          <Trophy size={16} className="text-accent" aria-hidden /> Poredak sezone
        </h2>
        <p className="mb-2.5 text-[11.5px] text-muted">
          Po promjeni rejtinga u sezoni. Ulaze igrači s barem {MVP_MIN_GAMES} partija.
        </p>
        {standings.length === 0 ? (
          <p className="text-[13px] text-subtle">
            Nitko još nema {MVP_MIN_GAMES} partija u ovoj sezoni.
          </p>
        ) : null}
        <ol className="flex flex-col gap-1.5">
          {standings.map((row, index) => (
            <li key={row.playerId}>
              <Link
                href={`/players/${row.username}`}
                className="flex items-center justify-between gap-3 rounded-[12px] bg-well/40 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="w-5 text-right font-mono text-[12px] font-bold text-dim">{index + 1}</span>
                  <PlayerAvatar id={row.playerId} name={row.username} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-bold text-heading">{row.username}</span>
                    <span className="block text-[11.5px] text-muted">
                      {row.wins}W / {row.games - row.wins}L ({percent(row.winRate)})
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`block text-[14px] font-extrabold ${row.delta >= 0 ? "text-accent" : "text-danger"}`}>
                    {signed(row.delta)}
                  </span>
                  <span className="block text-[11.5px] text-muted">{Math.round(row.ratingEnd)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
