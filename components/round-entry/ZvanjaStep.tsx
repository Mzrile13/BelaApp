import type { Player } from "@/lib/types";
import {
  offChipClass,
  SelectedMark,
  selectedChipClass,
  StepPanel,
  sumTokens,
  tap,
  TeamGroup,
  type ZvanjaValue,
} from "./shared";

const ZVANJA_VALUES: ZvanjaValue[] = [20, 50, 100, 150, 200];

interface ZvanjaStepProps {
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  tokensByPlayerA: Record<string, ZvanjaValue[]>;
  tokensByPlayerB: Record<string, ZvanjaValue[]>;
  zvanjaTeamA: number;
  zvanjaTeamB: number;
  activePlayerId: string;
  onActivePlayerChange: (playerId: string) => void;
  onAddZvanje: (value: ZvanjaValue) => void;
  onResetPlayer: () => void;
}

export function ZvanjaStep({
  teamAPlayers,
  teamBPlayers,
  tokensByPlayerA,
  tokensByPlayerB,
  zvanjaTeamA,
  zvanjaTeamB,
  activePlayerId,
  onActivePlayerChange,
  onAddZvanje,
  onResetPlayer,
}: ZvanjaStepProps) {
  const teams = [
    { label: "Tim A", players: teamAPlayers, tokens: tokensByPlayerA },
    { label: "Tim B", players: teamBPlayers, tokens: tokensByPlayerB },
  ];
  const activeTokens =
    (teamAPlayers.some((player) => player.id === activePlayerId)
      ? tokensByPlayerA[activePlayerId]
      : tokensByPlayerB[activePlayerId]) ?? [];
  const activePlayerName =
    [...teamAPlayers, ...teamBPlayers].find((player) => player.id === activePlayerId)?.username ??
    "";

  return (
    <StepPanel
      step={2}
      title="Zvanja"
      aside={
        <span className="ml-auto text-[11px] text-subtle">
          A <b className="font-mono text-ink">{zvanjaTeamA}</b> · B{" "}
          <b className="font-mono text-ink">{zvanjaTeamB}</b>
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {teams.map((team) => (
          <TeamGroup key={team.label} label={team.label}>
            {team.players.map((player) => {
              const playerTotal = sumTokens(team.tokens[player.id]);
              const selected = activePlayerId === player.id;
              return (
                <button
                  key={player.id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${player.username}, zvanja ${playerTotal}`}
                  onClick={() => {
                    tap();
                    onActivePlayerChange(player.id);
                  }}
                  className={`relative flex items-center justify-between gap-1 rounded-[9px] border px-1.5 py-2 ${
                    selected ? selectedChipClass : offChipClass
                  }`}
                >
                  <SelectedMark show={selected} />
                  <span className="min-w-0 truncate text-[12px] font-bold text-heading">
                    {player.username}
                  </span>
                  <span
                    className={`shrink-0 font-mono text-[12px] font-bold ${
                      playerTotal > 0 ? "text-accent" : "text-dim"
                    }`}
                  >
                    {playerTotal}
                  </span>
                </button>
              );
            })}
          </TeamGroup>
        ))}
      </div>

      <div
        className="grid grid-cols-[repeat(5,1fr)_auto] gap-1"
        role="group"
        aria-label={`Dodaj zvanje igraču ${activePlayerName}`}
      >
        {ZVANJA_VALUES.map((value) => {
          const toggle = value === 150 || value === 200;
          const active = toggle && activeTokens.includes(value);
          return (
            <button
              type="button"
              key={value}
              aria-pressed={toggle ? active : undefined}
              onClick={() => {
                tap();
                onAddZvanje(value);
              }}
              className={`rounded-[8px] border py-2 text-center text-[12px] font-extrabold text-on-accent ${
                active ? "border-white/55 bg-accent-soft" : "border-transparent bg-accent/85"
              }`}
            >
              +{value}
            </button>
          );
        })}
        <button
          type="button"
          aria-label={`Obriši zvanja igrača ${activePlayerName}`}
          onClick={() => {
            tap();
            onResetPlayer();
          }}
          className="rounded-[8px] bg-well/50 px-2.5 text-[12px] font-bold text-subtle"
        >
          Reset
        </button>
      </div>
    </StepPanel>
  );
}
