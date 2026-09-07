import { TrendingDown, TrendingUp } from "lucide-react";
import { RatingSparkline } from "@/components/RatingSparkline";
import type { PlayerStats } from "@/lib/types";

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
    <article className="rounded-[18px] border border-[rgba(255,255,255,0.05)] bg-[rgba(15,50,36,0.5)] p-4">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="truncate text-[16px] font-bold text-[#f7fbf6]">{stats.username}</h3>
        <div className="flex shrink-0 items-center gap-2">
          <RatingSparkline values={stats.ratingTrail} />
          <span className="rounded-full bg-[#c9d9a0] px-2.5 py-1 text-[11px] font-extrabold text-[#10261c]">
            {Math.round(stats.rating)} ±{Math.round(stats.sigma)}
          </span>
        </div>
      </div>

      {stats.bestPartnerUsername || stats.nemesisUsername ? (
        <div className="mb-2.5 grid gap-1.5 sm:grid-cols-2">
          {stats.bestPartnerUsername ? (
            <p className="flex justify-between rounded-[10px] bg-[rgba(6,20,16,0.45)] px-2.5 py-[7px] text-[11.5px] text-[#a9c2b3]">
              <span>Najbolji partner</span>
              <b className="font-semibold text-[#eef3ee]">
                {stats.bestPartnerUsername} ({signed(stats.bestPartnerChemistry * 100, 0)}%)
              </b>
            </p>
          ) : null}
          {stats.nemesisUsername ? (
            <p className="flex justify-between rounded-[10px] bg-[rgba(6,20,16,0.45)] px-2.5 py-[7px] text-[11.5px] text-[#a9c2b3]">
              <span>Nezgodan protivnik</span>
              <b className="font-semibold text-[#eef3ee]">
                {stats.nemesisUsername} ({signed(stats.nemesisDelta * 100, 0)}%)
              </b>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-[12px] bg-[rgba(6,20,16,0.45)] py-[9px]">
        <p className="flex items-center gap-1.5 pl-2.5 text-[12px] font-semibold text-[#dcece3]">
          {winsInLast10 > lossesInLast10 ? (
            <TrendingUp size={14} className="text-[#c9d9a0]" />
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
                result === "W" ? "bg-[#c9d9a0]" : "bg-[rgba(196,90,74,0.85)]"
              }`}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
