import { UserRound } from "lucide-react";
import type { Game, Player } from "@/lib/types";

interface GameHeaderProps {
  game: Game;
  playersById: Map<string, Player>;
  score: { teamA: number; teamB: number };
  dealerPlayerId?: string;
}

function names(ids: string[], playersById: Map<string, Player>) {
  return ids.map((id) => playersById.get(id)?.username ?? "Unknown").join(" + ");
}

export function GameHeader({
  game,
  playersById,
  score,
  dealerPlayerId,
}: GameHeaderProps) {
  const dealer =
    playersById.get(dealerPlayerId ?? game.dealerPlayerId)?.username ?? "Unknown";
  return (
    <section className="rounded-2xl border border-emerald-800/30 bg-emerald-900/60 p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-emerald-50">Aktivna partija</h1>
        <div className="flex items-center gap-2 text-base font-semibold text-emerald-100/90">
          <UserRound size={16} />
          <span>Sljedeći dijeli: {dealer}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-emerald-800/70 p-3">
          <p className="text-sm text-emerald-200">Tim A</p>
          <p className="text-base font-semibold text-white">
            {names(game.teams.teamA, playersById)}
          </p>
          <p className="mt-2 text-4xl font-extrabold text-lime-300">{score.teamA}</p>
        </div>

        <div className="rounded-xl bg-emerald-800/70 p-3">
          <p className="text-sm text-emerald-200">Tim B</p>
          <p className="text-base font-semibold text-white">
            {names(game.teams.teamB, playersById)}
          </p>
          <p className="mt-2 text-4xl font-extrabold text-lime-300">{score.teamB}</p>
        </div>
      </div>
    </section>
  );
}
