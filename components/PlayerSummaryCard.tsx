import { TrendingDown, TrendingUp } from "lucide-react";
import { RatingSparkline } from "@/components/RatingSparkline";
import type { PlayerStats } from "@/lib/types";
import { PlayerAvatar } from "@/components/PlayerAvatar";

function signed(value: number, digits = 0) {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

/**
 * Skraćena kartica za naslovnicu: samo rejting, kretanje i odnosi. Puna
 * statistika je na profilu igrača — na naslovnici je bila predugačka da bi se
 * tri igrača vidjela bez skrolanja.
 */
export function PlayerSummaryCard({ stats }: { stats: PlayerStats }) {
  const streakLabel =
    stats.currentStreak > 0
      ? `W${stats.currentStreak}`
      : stats.currentStreak < 0
        ? `L${Math.abs(stats.currentStreak)}`
        : "-";
  const winsInLast10 = stats.last10GameResults.filter((result) => result === "W").length;
  const lossesInLast10 = stats.last10GameResults.filter((result) => result === "L").length;
  const losses = Math.max(0, stats.gamesPlayed - stats.gamesWon);

  return (
    <article className="rounded-[18px] border border-white/5 bg-panel/50 p-4">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 text-[16px] font-bold text-heading">
          <PlayerAvatar id={stats.playerId} name={stats.username} size="sm" />
          <span className="truncate">{stats.username}</span>
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <RatingSparkline values={stats.ratingTrail} />
          <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-extrabold text-on-accent">
            {Math.round(stats.rating)} ±{Math.round(stats.sigma)}
          </span>
        </div>
      </div>

      {stats.bestPartnerUsername || stats.nemesisUsername ? (
        <div className="mb-2.5 grid gap-1.5 sm:grid-cols-2">
          {stats.bestPartnerUsername ? (
            <p className="flex justify-between rounded-[10px] bg-well/45 px-2.5 py-[7px] text-[11.5px] text-subtle">
              <span>Najbolji partner</span>
              <b className="font-semibold text-ink">
                {stats.bestPartnerUsername} ({signed(stats.bestPartnerChemistry * 100, 0)}%)
              </b>
            </p>
          ) : null}
          {stats.nemesisUsername ? (
            <p className="flex justify-between rounded-[10px] bg-well/45 px-2.5 py-[7px] text-[11.5px] text-subtle">
              <span>Nezgodan protivnik</span>
              <b className="font-semibold text-ink">
                {stats.nemesisUsername} ({signed(stats.nemesisDelta * 100, 0)}%)
              </b>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-[12px] bg-well/45 py-[9px]">
        <p className="flex items-center gap-1.5 pl-2.5 text-[12px] font-semibold text-soft">
          {winsInLast10 > lossesInLast10 ? (
            <TrendingUp size={14} className="text-accent" />
          ) : lossesInLast10 > winsInLast10 ? (
            <TrendingDown size={14} className="text-rose-300" />
          ) : null}
          {stats.gamesWon}W / {losses}L · {streakLabel}
        </p>
        <div className="flex gap-1 pr-2.5">
          {stats.last5GameResults.map((result, index) => (
            <span
              key={index}
              className={`h-[7px] w-[7px] rounded-full ${
                result === "W" ? "bg-accent" : "bg-pad/85"
              }`}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
