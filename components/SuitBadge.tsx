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
  chip?: boolean;
  bare?: boolean;
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

export function SuitBadge({
  suit,
  selected = false,
  compact = false,
  chip = false,
  bare = false,
}: SuitBadgeProps) {
  if (bare) {
    return (
      <Image
        src={suitIcons[suit]}
        alt={suitLabels[suit]}
        width={16}
        height={16}
        className="h-4 w-4 object-contain"
      />
    );
  }

  if (chip) {
    return (
      <span
        className={`flex items-center justify-center gap-1.5 rounded-[9px] border px-0.5 py-2 ${
          selected
            ? "border-accent/70 bg-accent/12"
            : "border-subtle/16 bg-well/40"
        }`}
      >
        <Image
          src={suitIcons[suit]}
          alt={suitLabels[suit]}
          width={18}
          height={18}
          className="h-[18px] w-[18px] object-contain"
        />
        <span className="text-[11px] font-semibold text-ink">{suitLabels[suit]}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-xl border ${
        compact ? "gap-2 px-2 py-1.5" : "min-h-14 w-full justify-start gap-3 px-4 py-3"
      } ${
        selected
          ? "border-accent bg-linear-to-r from-emerald-700/90 to-emerald-600/80 text-white shadow-md shadow-emerald-900/40"
          : "border-subtle/18 bg-well/40 text-soft"
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
