import { Check } from "lucide-react";
import type { ReactNode } from "react";

export type PointsField = "pointsTeamA" | "pointsTeamB";
export type ZvanjaValue = 20 | 50 | 100 | 150 | 200;

export const selectedChipClass = "border-accent/70 bg-accent/14";
export const offChipClass = "border-subtle/18 bg-well/40";

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
      className="flex animate-fade-up flex-col gap-2 rounded-[14px] border border-white/5 bg-panel/50 p-2.5"
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

/** Kvačica na kutu odabranog čipa (izvan teksta), da odabir nije označen samo bojom. */
export function SelectedMark({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      aria-hidden
      className="absolute -top-1.5 -right-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-on-accent ring-2 ring-sheet"
    >
      <Check size={10} strokeWidth={3.5} />
    </span>
  );
}

interface TeamGroupProps {
  label: string;
  children: ReactNode;
}

/**
 * Čipovi jednog tima u tankom okviru s oznakom na gornjem rubu. Prije je
 * "Tim A / Tim B" bio zaseban redak iznad čipova u svakom koraku. Nativni
 * fieldset/legend sam prekida obrub iza oznake (bez maske u boji pozadine) i
 * daje grupi pristupačno ime.
 */
export function TeamGroup({ label, children }: TeamGroupProps) {
  return (
    <fieldset className="min-w-0 rounded-[11px] border border-white/10 px-0.5 pb-0.5">
      <legend className="ml-1.5 px-1 text-[11px] leading-none font-bold uppercase tracking-[0.06em] text-dim">
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-1">{children}</div>
    </fieldset>
  );
}
