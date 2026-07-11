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
  const recentGamesLabel =
    stats.last5GameResults.length > 0 ? stats.last5GameResults.join(" · ") : "-";
  const winsInLast10 = stats.last10GameResults.filter((result) => result === "W").length;
  const lossesInLast10 = stats.last10GameResults.filter((result) => result === "L").length;

  return (
    <article className="rounded-2xl border border-emerald-700/40 bg-emerald-900/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{stats.username}</h3>
        <span className="rounded-full bg-amber-300 px-2 py-1 text-xs font-bold text-emerald-950">
          MVP {stats.mvpScore}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-emerald-100">
        <p>Odigrane partije: {stats.gamesPlayed}</p>
        <p>Pobjede: {winRate}%</p>
        <p>Bodovi po ruci: {stats.avgPoints}</p>
        <p>Plus minus: {avgPlusMinusPerGame}</p>
        <p>Prosj. štiglji: {avgStigliaPerGame}</p>
        <p>Prosj. zvanja: {stats.avgZvanja}</p>
        <p>Zvao po ruci: {stats.callsPerRoundAvg.toFixed(2)}</p>
        <p>Prolaznost: {(stats.callerSuccessRate * 100).toFixed(1)}%</p>
        <p>Trenutni streak: {streakLabel}</p>
        <p>Max win streak: W{stats.bestWinStreak}</p>
        <p>Najdraži znak: {stats.favoriteCalledSuit ? suitName[stats.favoriteCalledSuit] : "-"}</p>
        <p>Clutch: {(stats.clutchIndex * 100).toFixed(1)}%</p>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-950/40 px-3 py-2 text-sm">
        <div className="flex items-center gap-2 text-emerald-100">
          {winsInLast10 > lossesInLast10 ? (
            <TrendingUp size={16} className="text-amber-300" />
          ) : lossesInLast10 > winsInLast10 ? (
            <TrendingDown size={16} className="text-rose-300" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-emerald-200" />
          )}
          {stats.gamesWon}W/{Math.max(0, stats.gamesPlayed - stats.gamesWon)}L
        </div>
        <p className="text-emerald-200">{recentGamesLabel}</p>
      </div>
    </article>
  );
}
