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
  const teamANames = names(game.teams.teamA, playersById);
  const teamBNames = names(game.teams.teamB, playersById);
  return (
    <section className="glass-card rounded-[16px] px-3 py-[11px]">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-[18px] font-extrabold text-[#f7fbf6]">Aktivna partija</h1>
        <p className="text-[13px] font-semibold text-[#a9c2b3]">Dijeli: {dealer}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[12px] bg-[rgba(6,20,16,0.4)] px-2.5 py-2">
          <p className="text-[10px] font-semibold text-[#8fa89b]">TIM A</p>
          <p className="mt-0.5 mb-[3px] text-[11.5px] font-bold break-words text-[#eef3ee]">
            {teamANames}
          </p>
          <p className="font-mono text-[28px] font-extrabold text-[#c9d9a0]">{score.teamA}</p>
        </div>

        <div className="rounded-[12px] bg-[rgba(6,20,16,0.4)] px-2.5 py-2">
          <p className="text-[10px] font-semibold text-[#8fa89b]">TIM B</p>
          <p className="mt-0.5 mb-[3px] text-[11.5px] font-bold break-words text-[#eef3ee]">
            {teamBNames}
          </p>
          <p className="font-mono text-[28px] font-extrabold text-[#c9d9a0]">{score.teamB}</p>
        </div>
      </div>
    </section>
  );
}
