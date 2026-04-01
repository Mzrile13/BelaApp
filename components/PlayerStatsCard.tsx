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

  return (
    <article className="rounded-2xl border border-emerald-700/40 bg-emerald-900/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{stats.username}</h3>
        <span className="rounded-full bg-lime-300 px-2 py-1 text-xs font-bold text-emerald-950">
          MVP {stats.mvpScore}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-emerald-100">
        <p>Odigrane partije: {stats.gamesPlayed}</p>
        <p>Postotak pobjeda: {winRate}%</p>
        <p>Bodovi: {stats.pointsWon}</p>
        <p>Prosjek: {stats.avgPoints}</p>
        <p>Zvanja: {stats.zvanjaTotal}</p>
        <p>Štiglja: {stats.stigliaCount}</p>
        <p>Prosj. zvanja: {stats.avgZvanja}</p>
        <p>Zvao: {stats.timesCalled}</p>
        <p>Zvao po ruci: {stats.callsPerRoundAvg.toFixed(2)}</p>
        <p>Prolaznost: {(stats.callerSuccessRate * 100).toFixed(1)}%</p>
        <p>Najdraži znak: {stats.favoriteCalledSuit ? suitName[stats.favoriteCalledSuit] : "-"}</p>
        <p>Clutch: {(stats.clutchIndex * 100).toFixed(1)}%</p>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-950/40 px-3 py-2 text-sm">
        <div className="flex items-center gap-2 text-emerald-100">
          {stats.trend === "hot" ? (
            <TrendingUp size={16} className="text-lime-300" />
          ) : stats.trend === "cold" ? (
            <TrendingDown size={16} className="text-rose-300" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-emerald-200" />
          )}
          Forma: {stats.trend}
        </div>
        <p className="text-emerald-200">L5: {stats.avgLast5}</p>
      </div>
    </article>
  );
}
