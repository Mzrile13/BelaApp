import { Check } from "lucide-react";
import type { ReactNode } from "react";

export type PointsField = "pointsTeamA" | "pointsTeamB";
export type ZvanjaValue = 20 | 50 | 100 | 150 | 200;

export const selectedChipClass = "border-accent/70 bg-accent/14";
export const offChipClass = "border-subtle/18 bg-well/40";
export const teamMiniLabelClass =
  "mb-1 text-center text-[11px] font-bold uppercase tracking-[0.06em] text-dim";

/** Kratka vibracija kao potvrda dodira; tiho ne radi ništa gdje nije podržano. */
export function tap() {
  try {
    navigator.vibrate?.(10);
  } catch {
    // Neki preglednici bacaju iznimku izvan korisničke geste.
  }
}

export function sumTokens(tokens: ZvanjaValue[] | undefined) {
  return (tokens ?? []).reduce((sum, value) => sum + value, 0);
}

interface StepPanelProps {
  step: number;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}

/** Numerirani korak unosa; naslov služi i kao oznaka grupe za čitače ekrana. */
export function StepPanel({ step, title, aside, children }: StepPanelProps) {
  const titleId = `round-step-${step}`;
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className="flex animate-fade-up flex-col gap-2.5 rounded-[16px] border border-white/5 bg-panel/50 p-3"
      style={{ animationDelay: `${(step - 1) * 60}ms` }}
    >
      <div className="flex items-center gap-[7px]">
        <span
          aria-hidden
          className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-accent/16 text-[11px] font-extrabold text-accent"
        >
          {step}
        </span>
        <p id={titleId} className="text-[12px] font-bold uppercase tracking-[0.05em] text-muted">
          {title}
        </p>
        {aside}
      </div>
      {children}
    </div>
  );
}

/** Kvačica u kutu odabranog čipa, da odabir nije označen samo bojom. */
export function SelectedMark({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      aria-hidden
      className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-on-accent"
    >
      <Check size={10} strokeWidth={3.5} />
    </span>
  );
}
