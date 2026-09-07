import { TrendingDown, TrendingUp } from "lucide-react";
import type { CalledSuit, PairStats } from "@/lib/types";

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

export function PairStatsCard({ stats }: { stats: PairStats }) {
  const avgStigliaPerGame =
    stats.gamesTogether > 0 ? (stats.stigliaCount / stats.gamesTogether).toFixed(2) : "0.00";
  const streakLabel =
    stats.currentStreak > 0
      ? `W${stats.currentStreak}`
      : stats.currentStreak < 0
        ? `L${Math.abs(stats.currentStreak)}`
        : "-";
  const winsInLast10 = stats.last10GameResults.filter((result) => result === "W").length;
  const lossesInLast10 = stats.last10GameResults.filter((result) => result === "L").length;
  const losses = Math.max(0, stats.gamesTogether - stats.winsTogether);
  const chemistryClass =
    stats.chemistry > 0.01
      ? "bg-[#c9d9a0] text-[#10261c]"
      : stats.chemistry < -0.01
        ? "bg-[rgba(196,90,74,0.85)] text-[#f7fbf6]"
        : "bg-[rgba(169,194,179,0.25)] text-[#eef3ee]";

  const statPairs: Array<[string, string]> = [
    ["Odigrane partije", String(stats.gamesTogether)],
    ["Pobjede", percent(stats.winRate)],
    ["Očekivano", percent(stats.expectedWinRate)],
    ["Zajednički rejting", String(Math.round(stats.combinedRating))],
    ["Bodovi po ruci", String(stats.avgPoints)],
    ["Plus minus", stats.avgPlusMinusPerGame.toFixed(2)],
    ["Prosj. štiglji", avgStigliaPerGame],
    ["Prosj. zvanja", String(stats.avgZvanja)],
    ["Zvali po ruci", stats.callsPerRoundAvg.toFixed(2)],
    ["Zvanja iz volje", `${stats.voluntaryCalls} / ${stats.timesCalled}`],
    ["Zvanja na mus", `${stats.forcedCalls} / ${stats.timesCalled}`],
    ["Prolaznost", percent(stats.callerSuccessRate, 0)],
    ["Vrijednost zvanja", `${signed(stats.callValueAdded, 1)}/partiji`],
    ["Završnica", stats.clutchRounds > 0 ? percent(stats.clutchIndex, 0) : "-"],
    ["Trenutni streak", streakLabel],
    ["Max win streak", `W${stats.bestWinStreak}`],
    ["Najdraži znak", stats.favoriteCalledSuit ? suitName[stats.favoriteCalledSuit] : "-"],
  ];

  return (
    <article className="rounded-[18px] border border-[rgba(255,255,255,0.05)] bg-[rgba(15,50,36,0.5)] p-4">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold text-[#f7fbf6]">
            {stats.playerAUsername} + {stats.playerBUsername}
          </h3>
          <p className="mt-0.5 text-[11px] text-[#8fa89b]">
            Kemija = stvarni minus očekivani postotak pobjeda
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${chemistryClass}`}
        >
          {signed(stats.chemistry * 100, 1)}%
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
            <TrendingUp size={14} className="text-[#c9d9a0]" />
          ) : lossesInLast10 > winsInLast10 ? (
            <TrendingDown size={14} className="text-rose-300" />
          ) : null}
          {stats.winsTogether}W / {losses}L · {streakLabel}
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
