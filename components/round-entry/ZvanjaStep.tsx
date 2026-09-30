import type { Player } from "@/lib/types";
import {
  offChipClass,
  SelectedMark,
  selectedChipClass,
  StepPanel,
  sumTokens,
  tap,
  teamMiniLabelClass,
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
  stigliaTeam: "A" | "B" | null;
  onActivePlayerChange: (playerId: string) => void;
  onAddZvanje: (value: ZvanjaValue) => void;
  onStiglia: () => void;
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
  stigliaTeam,
  onActivePlayerChange,
  onAddZvanje,
  onStiglia,
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
      step={3}
      title="Zvanja"
      aside={
        <span className="ml-auto text-[11px] text-subtle">
          A <b className="font-mono text-ink">{zvanjaTeamA}</b> · B{" "}
          <b className="font-mono text-ink">{zvanjaTeamB}</b>
        </span>
      }
    >
      <p className="text-[11.5px] text-dim">Odaberi igrača, pa dodaj vrijednost:</p>

      <div className="grid grid-cols-2 gap-2">
        {teams.map((team) => (
          <div key={team.label}>
            <p className={teamMiniLabelClass}>{team.label}</p>
            <div className="grid grid-cols-2 gap-1.5">
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
                    className={`relative flex flex-col items-center rounded-[9px] border px-[3px] py-1.5 text-center ${
                      selected ? selectedChipClass : offChipClass
                    }`}
                  >
                    <SelectedMark show={selected} />
                    <span className="block w-full truncate px-2 text-[12px] font-bold text-heading">
                      {player.username}
                    </span>
                    <span
                      className={`mt-px font-mono text-[12px] font-bold ${
                        playerTotal > 0 ? "text-accent" : "text-dim"
                      }`}
                    >
                      {playerTotal}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-5 gap-1.5"
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
      </div>

      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          aria-pressed={stigliaTeam !== null}
          onClick={() => {
            tap();
            onStiglia();
          }}
          className={`flex flex-1 items-center justify-between gap-2 rounded-[10px] border px-3 py-2 ${
            stigliaTeam ? "border-transparent bg-accent/85" : "border-subtle/16 bg-well/40"
          }`}
        >
          <span
            className={`text-[12px] font-extrabold ${stigliaTeam ? "text-on-accent" : "text-soft"}`}
          >
            Štiglja +90
          </span>
          <span
            className={`text-[11.5px] font-semibold ${
              stigliaTeam ? "text-on-accent/75" : "text-dim"
            }`}
          >
            {stigliaTeam ? `Tim ${stigliaTeam}` : "Nije upisana"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            tap();
            onResetPlayer();
          }}
          className="flex flex-shrink-0 items-center rounded-[10px] bg-well/50 px-3 py-2 text-[11.5px] font-bold text-subtle"
        >
          Reset igrača
        </button>
      </div>
    </StepPanel>
  );
}
