import { TrendingDown, TrendingUp } from "lucide-react";
import { RatingSparkline } from "@/components/RatingSparkline";
import type { CalledSuit, PlayerStats } from "@/lib/types";

const suitName: Record<CalledSuit, string> = {
  karo: "karo",
  herc: "herc",
  pik: "pik",
  tref: "tref",
};

function signed(value: number, digits = 0) {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function percent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function PlayerStatsCard({ stats }: { stats: PlayerStats }) {
  const winRate = stats.gamesPlayed > 0 ? percent(stats.gamesWon / stats.gamesPlayed) : "0.0%";
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
    ["Pobjede", winRate],
    ["Najviši rejting", String(Math.round(stats.peakRating))],
    ["Forma (10 partija)", signed(stats.formDelta)],
    ["Bodovi po ruci", String(stats.avgPoints)],
    ["Plus minus", avgPlusMinusPerGame],
    ["Prosj. štiglji", avgStigliaPerGame],
    ["Prosj. zvanja", String(stats.avgZvanja)],
    ["Zvao iz volje", percent(stats.voluntaryCallRate)],
    ["Prolaznost iz volje", percent(stats.voluntaryCallerSuccessRate, 0)],
    ["Prolaznost iz mora", percent(stats.forcedCallerSuccessRate, 0)],
    ["Vrijednost zvanja", `${signed(stats.callValueAdded, 1)}/partiji`],
    ["Završnica", stats.clutchRounds > 0 ? percent(stats.clutchIndex, 0) : "-"],
    ["Stabilnost", stats.consistencyIndex.toFixed(1)],
    ["Najveći preokret", String(stats.biggestComeback)],
    ["Trenutni streak", streakLabel],
    ["Max win streak", `W${stats.bestWinStreak}`],
    ["Najdraži znak", stats.favoriteCalledSuit ? suitName[stats.favoriteCalledSuit] : "-"],
  ];

  return (
    <article className="rounded-[18px] border border-[rgba(255,255,255,0.05)] bg-[rgba(15,50,36,0.5)] p-4">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-[18px] font-bold text-[#f7fbf6]">
            <span className="truncate">{stats.username}</span>
            {stats.provisional ? (
              <span className="shrink-0 rounded-full bg-[rgba(169,194,179,0.18)] px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.04em] text-[#8fa89b]">
                novo
              </span>
            ) : null}
          </h3>
          <p className="mt-0.5 text-[11px] text-[#8fa89b]">
            Rejting je korigiran na partnera i protivnika
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <RatingSparkline values={stats.ratingTrail} />
          <span className="rounded-full bg-[#c9d9a0] px-2.5 py-1 text-[11px] font-extrabold text-[#10261c]">
            {Math.round(stats.rating)} ±{Math.round(stats.sigma)}
          </span>
        </div>
      </div>

      <div className="mb-2.5 grid grid-cols-2 gap-x-2.5 gap-y-1.5">
        {statPairs.map(([label, value]) => (
          <p key={label} className="flex justify-between text-[12px] text-[#a9c2b3]">
            <span>{label}</span>
            <b className="font-semibold text-[#eef3ee]">{value}</b>
          </p>
        ))}
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
