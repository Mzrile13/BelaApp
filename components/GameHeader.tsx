import { AnimatedNumber } from "@/components/AnimatedNumber";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { Game, Player } from "@/lib/types";

interface GameHeaderProps {
  game: Game;
  playersById: Map<string, Player>;
  score: { teamA: number; teamB: number };
  dealerPlayerId?: string;
  finished?: boolean;
}

function TeamNames({ ids, playersById }: { ids: string[]; playersById: Map<string, Player> }) {
  return (
    <p className="mt-1 mb-[3px] flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] font-bold text-ink">
      {ids.map((id, index) => {
        const name = playersById.get(id)?.username ?? "Unknown";
        return (
          <span key={id} className="inline-flex items-center gap-1">
            {index > 0 ? <span className="text-dim">+</span> : null}
            <PlayerAvatar id={id} name={name} size="xs" />
            <span className="break-words">{name}</span>
          </span>
        );
      })}
    </p>
  );
}

export function GameHeader({
  game,
  playersById,
  score,
  dealerPlayerId,
  finished = false,
}: GameHeaderProps) {
  const dealer =
    playersById.get(dealerPlayerId ?? game.dealerPlayerId)?.username ?? "Unknown";
  const teams = [
    { label: "TIM A", ids: game.teams.teamA, points: score.teamA, key: "A" },
    { label: "TIM B", ids: game.teams.teamB, points: score.teamB, key: "B" },
  ];
  return (
    <section className="glass-card rounded-[16px] px-3 py-[11px]">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-[18px] font-extrabold text-heading">
          {finished ? "Završena partija" : "Aktivna partija"}
        </h1>
        {finished ? null : (
          <p className="text-[13px] font-semibold text-subtle">Dijeli: {dealer}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {teams.map((team) => (
          <div key={team.key} className="rounded-[12px] bg-well/40 px-2.5 py-2">
            <p className="text-[11px] font-semibold text-muted">{team.label}</p>
            <TeamNames ids={team.ids} playersById={playersById} />
            <p className="font-mono text-[28px] font-extrabold text-accent">
              <AnimatedNumber value={team.points} storageKey={`score:${game.id}:${team.key}`} />
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
