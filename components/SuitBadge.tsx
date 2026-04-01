import Image, { type StaticImageData } from "next/image";
import type { CalledSuit } from "@/lib/types";
import karoIcon from "@/images/karo.gif";
import hercIcon from "@/images/herc.gif";
import pikIcon from "@/images/pik.svg.png";
import trefIcon from "@/images/tref.svg.png";

interface SuitBadgeProps {
  suit: CalledSuit;
  selected?: boolean;
  compact?: boolean;
}

const suitLabels: Record<CalledSuit, string> = {
  karo: "karo",
  herc: "herc",
  pik: "pik",
  tref: "tref",
};

const suitIcons: Record<CalledSuit, StaticImageData> = {
  karo: karoIcon,
  herc: hercIcon,
  pik: pikIcon,
  tref: trefIcon,
};

export function SuitBadge({ suit, selected = false, compact = false }: SuitBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-xl border ${
        compact ? "gap-2 px-2 py-1.5" : "min-h-14 w-full justify-start gap-3 px-4 py-3"
      } ${
        selected
          ? "border-lime-300 bg-linear-to-r from-emerald-700/90 to-emerald-600/80 text-white shadow-md shadow-emerald-900/40"
          : "border-emerald-600/60 bg-emerald-950/45 text-emerald-100"
      }`}
    >
      <Image
        src={suitIcons[suit]}
        alt={suitLabels[suit]}
        width={compact ? 20 : 28}
        height={compact ? 20 : 28}
        className={compact ? "h-5 w-5 object-contain" : "h-7 w-7 object-contain"}
      />
      {!compact ? (
        <span className="text-base font-semibold tracking-wide">{suitLabels[suit]}</span>
      ) : null}
    </span>
  );
}

export function suitLabel(suit: CalledSuit) {
  return suitLabels[suit];
}
