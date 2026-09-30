import Link from "next/link";
import { RotateCcw, Trophy } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ShareButton } from "@/components/ShareButton";
import type { Game, Player, TeamId } from "@/lib/types";

interface VictoryCardProps {
  game: Game;
  playersById: Map<string, Player>;
  winnerTeam: TeamId;
  score: { teamA: number; teamB: number };
  ratingDeltas: Record<string, number>;
  bestRound: { roundNumber: number; team: TeamId; points: number } | null;
  roundsCount: number;
  /** Tek završena partija (dolazak iz unosa ruke): pusti konfete. */
  celebrate: boolean;
}

const CONFETTI_COLORS = ["#c9d9a0", "#e7cd8e", "#8fbfa4", "#a9b6e0", "#e0a9b6", "#d7f1c7"];

function Confetti() {
  // Deterministički raspored (bez Math.random), da server i klijent renderiraju isto.
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-visible">
      {Array.from({ length: 18 }, (_, i) => (
        <span
          key={i}
          className="absolute top-0 block h-2 w-1.5 animate-confetti rounded-[1px]"
          style={
            {
              left: `${(i * 53) % 100}%`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${(i % 6) * 70}ms`,
              "--dx": `${((i * 37) % 80) - 40}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

export function VictoryCard({
  game,
  playersById,
  winnerTeam,
  score,
  ratingDeltas,
  bestRound,
  roundsCount,
  celebrate,
}: VictoryCardProps) {
  const winnerIds = winnerTeam === "A" ? game.teams.teamA : game.teams.teamB;
  const loserIds = winnerTeam === "A" ? game.teams.teamB : game.teams.teamA;
  const nameOf = (id: string) => playersById.get(id)?.username ?? "Unknown";
  const winnerNames = winnerIds.map(nameOf).join(" i ");
  const shareText = `${winnerNames} pobijedili ${score.teamA}:${score.teamB} (Bela Tracker)`;

  const playerRow = (id: string) => {
    const delta = ratingDeltas[id];
    return (
      <li key={id} className="flex items-center justify-between gap-2 py-1">
        <span className="flex min-w-0 items-center gap-2">
          <PlayerAvatar id={id} name={nameOf(id)} size="sm" />
          <span className="truncate text-[13.5px] font-bold text-heading">{nameOf(id)}</span>
        </span>
        {delta !== undefined ? (
          <span className={`font-mono text-[13px] font-bold ${delta >= 0 ? "text-ok" : "text-danger"}`}>
            {signed(delta)}
          </span>
        ) : null}
      </li>
    );
  };

  return (
    <section className="relative overflow-hidden rounded-[20px] border border-accent/40 bg-accent/10 p-4">
      {celebrate ? <Confetti /> : null}
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 animate-pop items-center justify-center rounded-full bg-accent text-on-accent">
          <Trophy size={24} aria-hidden />
        </span>
        <h2 className="mt-2 animate-pop text-[20px] font-extrabold text-heading">
          Pobjeda: Tim {winnerTeam}
        </h2>
        <p className="text-[13px] text-subtle">{winnerNames}</p>
        <p className="mt-1 font-mono text-[26px] font-extrabold text-accent">
          {score.teamA} : {score.teamB}
        </p>
        <p className="text-[12px] text-muted">
          {roundsCount} ruku
          {bestRound
            ? ` · najbolja ruka #${bestRound.roundNumber} (Tim ${bestRound.team}, ${bestRound.points})`
            : ""}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 rounded-[14px] bg-well/40 px-3 py-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-accent">Pobjednici</p>
          <ul>{winnerIds.map(playerRow)}</ul>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Gubitnici</p>
          <ul>{loserIds.map(playerRow)}</ul>
        </div>
      </div>
      {Object.keys(ratingDeltas).length ? (
        <p className="mt-1.5 text-center text-[11px] text-dim">Promjena rejtinga zbog ove partije</p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={`/new-game?rematch=${game.id}`}
          className="btn-accent flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold"
        >
          <RotateCcw size={18} aria-hidden />
          Revanš
        </Link>
        <ShareButton imageUrl={`/game/${game.id}/share-image`} text={shareText} />
      </div>
    </section>
  );
}
