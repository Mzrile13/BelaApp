import { type PointsField, StepPanel, tap } from "./shared";

interface PointsStepProps {
  teamAName: string;
  teamBName: string;
  pointsTeamA: number;
  pointsTeamB: number;
  activeField: PointsField;
  onActiveFieldChange: (field: PointsField) => void;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  stigliaTeam: "A" | "B" | null;
  /** Postavlja 162 : 0 i štiglju za tim čije je polje bodova aktivno. */
  onStiglia: () => void;
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const keyClass = "rounded-[9px] py-[9px] text-center";

export function PointsStep({
  teamAName,
  teamBName,
  pointsTeamA,
  pointsTeamB,
  activeField,
  onActiveFieldChange,
  onDigit,
  onBackspace,
  onClear,
  stigliaTeam,
  onStiglia,
}: PointsStepProps) {
  const fields: Array<{ field: PointsField; name: string; value: number }> = [
    { field: "pointsTeamA", name: teamAName, value: pointsTeamA },
    { field: "pointsTeamB", name: teamBName, value: pointsTeamB },
  ];

  return (
    <StepPanel
      step={3}
      title="Bodovi iz čiste igre"
      aside={<span className="ml-auto text-[11px] font-semibold text-dim">zbroj = 162</span>}
    >
      <div className="grid grid-cols-2 gap-2">
        {fields.map(({ field, name, value }) => {
          const active = activeField === field;
          return (
            <button
              key={field}
              type="button"
              aria-pressed={active}
              aria-label={`${name}: ${value} bodova${active ? ", unos aktivan" : ""}`}
              onClick={() => onActiveFieldChange(field)}
              className={`rounded-[11px] border px-[10px] py-1.5 text-left ${
                active ? "border-accent/70 bg-accent/12" : "border-subtle/16 bg-well/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-muted">{name}</p>
                {active ? (
                  <span className="text-[11px] font-extrabold tracking-[0.05em] text-accent">
                    ● UNOS
                  </span>
                ) : null}
              </div>
              <p className="font-mono text-[24px] leading-[1.15] font-extrabold text-heading">{value}</p>
            </button>
          );
        })}
      </div>

      {/* Štiglja je ovdje, uz bodove: odnosi se na tim čije je polje aktivno. */}
      <button
        type="button"
        aria-pressed={stigliaTeam !== null}
        onClick={() => {
          tap();
          onStiglia();
        }}
        className={`flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2 ${
          stigliaTeam ? "border-transparent bg-accent/85" : "border-subtle/16 bg-well/40"
        }`}
      >
        <span className={`text-[12px] font-extrabold ${stigliaTeam ? "text-on-accent" : "text-soft"}`}>
          Štiglja +90
        </span>
        <span
          className={`truncate text-[11.5px] font-semibold ${
            stigliaTeam ? "text-on-accent/75" : "text-dim"
          }`}
        >
          {stigliaTeam
            ? `Tim ${stigliaTeam}`
            : `za ${activeField === "pointsTeamA" ? teamAName : teamBName}`}
        </span>
      </button>

      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Tipkovnica za bodove">
        {DIGITS.map((digit) => (
          <button
            type="button"
            key={digit}
            onClick={() => {
              tap();
              onDigit(digit);
            }}
            className={`${keyClass} bg-white/5 font-mono text-[15px] font-bold text-ink`}
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          aria-label="Obriši zadnju znamenku"
          onClick={() => {
            tap();
            onBackspace();
          }}
          className={`${keyClass} bg-accent/12 text-[12px] font-bold text-accent`}
        >
          ⌫ Del
        </button>
        <button
          type="button"
          aria-label="Očisti bodove"
          onClick={() => {
            tap();
            onClear();
          }}
          className={`${keyClass} bg-accent/12 text-[12px] font-bold text-accent`}
        >
          Clear
        </button>
      </div>
    </StepPanel>
  );
}
