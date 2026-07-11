import { TrendingDown, TrendingUp } from "lucide-react";
import type { PlayerStats } from "@/lib/types";

const suitName: Record<"karo" | "herc" | "pik" | "tref", string> = {
  karo: "karo",
  herc: "herc",
  pik: "pik",
  tref: "tref",
};

export function PlayerStatsCard({ stats }: { stats: PlayerStats }) {
  const winRate =
    stats.gamesPlayed > 0 ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1) : "0.0";
  const avgStigliaPerGame =
    stats.gamesPlayed > 0 ? (stats.stigliaCount / stats.gamesPlayed).toFixed(2) : "0.00";
  const avgPlusMinusPerGame =
    stats.gamesPlayed > 0
      ? ((stats.pointsWon - stats.pointsAgainst) / stats.gamesPlayed).toFixed(2)
      : "0.00";
  const streakLabel =
    stats.currentStreak > 0
      ? `W${stats.currentStreak}`
      : stats.currentStreak < 0
        ? `L${Math.abs(stats.currentStreak)}`
        : "-";
  const winsInLast10 = stats.last10GameResults.filter((result) => result === "W").length;
  const lossesInLast10 = stats.last10GameResults.filter((result) => result === "L").length;
  const losses = Math.max(0, stats.gamesPlayed - stats.gamesWon);

  const statPairs: Array<[string, string]> = [
    ["Odigrane partije", String(stats.gamesPlayed)],
    ["Pobjede", `${winRate}%`],
    ["Bodovi po ruci", String(stats.avgPoints)],
    ["Plus minus", avgPlusMinusPerGame],
    ["Prosj. štiglji", avgStigliaPerGame],
    ["Prosj. zvanja", String(stats.avgZvanja)],
    ["Zvao po ruci", stats.callsPerRoundAvg.toFixed(2)],
    ["Prolaznost", `${(stats.callerSuccessRate * 100).toFixed(1)}%`],
    ["Trenutni streak", streakLabel],
    ["Max win streak", `W${stats.bestWinStreak}`],
    ["Najdraži znak", stats.favoriteCalledSuit ? suitName[stats.favoriteCalledSuit] : "-"],
    ["Clutch", `${(stats.clutchIndex * 100).toFixed(1)}%`],
  ];

  return (
    <article className="rounded-[18px] border border-[rgba(255,255,255,0.05)] bg-[rgba(15,50,36,0.5)] p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-[18px] font-bold text-[#f7fbf6]">{stats.username}</h3>
        <span className="rounded-full bg-[#d9b567] px-2.5 py-1 text-[11px] font-extrabold text-[#10261c]">
          MVP {stats.mvpScore}
        </span>
      </div>
      <div className="mb-2.5 grid grid-cols-2 gap-x-2.5 gap-y-1.5">
        {statPairs.map(([label, value]) => (
          <p key={label} className="flex justify-between text-[12px] text-[#a9c2b3]">
            <span>{label}</span>
            <b className="font-semibold text-[#eef3ee]">{value}</b>
          </p>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-[12px] bg-[rgba(6,20,16,0.45)] py-[9px]">
        <p className="flex items-center gap-1.5 pl-2.5 text-[12px] font-semibold text-[#dcece3]">
          {winsInLast10 > lossesInLast10 ? (
            <TrendingUp size={14} className="text-[#d9b567]" />
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
                result === "W" ? "bg-[#d9b567]" : "bg-[rgba(196,90,74,0.85)]"
              }`}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
