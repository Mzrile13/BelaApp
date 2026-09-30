import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SuitBadge } from "@/components/SuitBadge";
import type { CalledSuit, Player } from "@/lib/types";
import {
  offChipClass,
  SelectedMark,
  selectedChipClass,
  StepPanel,
  tap,
  teamMiniLabelClass,
} from "./shared";

const calledSuits: CalledSuit[] = ["karo", "herc", "pik", "tref"];

interface CallerStepProps {
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  callerPlayerId: string;
  calledSuit: CalledSuit;
  onCallerChange: (playerId: string) => void;
  onSuitChange: (suit: CalledSuit) => void;
}

export function CallerStep({
  teamAPlayers,
  teamBPlayers,
  callerPlayerId,
  calledSuit,
  onCallerChange,
  onSuitChange,
}: CallerStepProps) {
  const teams = [
    { label: "Tim A", players: teamAPlayers },
    { label: "Tim B", players: teamBPlayers },
  ];

  return (
    <StepPanel step={1} title="Tko je zvao i koji znak">
      <div className="grid grid-cols-2 gap-2">
        {teams.map((team) => (
          <div key={team.label}>
            <p className={teamMiniLabelClass}>{team.label}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {team.players.map((player) => {
                const selected = callerPlayerId === player.id;
                return (
                  <button
                    key={player.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      tap();
                      onCallerChange(player.id);
                    }}
                    className={`relative flex flex-col items-center gap-1 rounded-[9px] border px-[3px] py-2 text-center ${
                      selected ? selectedChipClass : offChipClass
                    }`}
                  >
                    <SelectedMark show={selected} />
                    <PlayerAvatar id={player.id} name={player.username} size="xs" />
                    <span className="block text-[12px] font-bold text-heading">
                      {player.username}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Zvani znak">
        {calledSuits.map((suit) => (
          <button
            key={suit}
            type="button"
            aria-pressed={calledSuit === suit}
            aria-label={suit}
            onClick={() => {
              tap();
              onSuitChange(suit);
            }}
            className="relative block"
          >
            <SelectedMark show={calledSuit === suit} />
            <SuitBadge suit={suit} selected={calledSuit === suit} chip />
          </button>
        ))}
      </div>
    </StepPanel>
  );
}
