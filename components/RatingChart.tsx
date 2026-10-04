"use client";

import { useMemo, useRef, useState } from "react";
import { plural } from "@/lib/plural";
import { APP_TIME_ZONE } from "@/lib/time";

export interface RatingPoint {
  gameId: string;
  createdAt: string;
  season: string;
  rating: number;
  delta: number;
  won: boolean;
}

interface RatingChartProps {
  points: RatingPoint[];
  initialRating: number;
}

const W = 640;
const H = 220;
const PAD = { top: 16, right: 14, bottom: 26, left: 40 };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "numeric",
    year: "2-digit",
    timeZone: APP_TIME_ZONE,
  });
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

/** Zaokruži granice osi na "lijepe" korake od 25. */
function niceBounds(values: number[]) {
  const min = Math.floor(Math.min(...values) / 25) * 25;
  const max = Math.ceil(Math.max(...values) / 25) * 25;
  return min === max ? [min - 25, max + 25] : [min, max];
}

/**
 * Rejting kroz partije: jedna serija (bez legende — naslov je imenuje),
 * referentna linija početnog rejtinga, okomite granice sezona, vrh označen
 * točkom. Hover/dodir pokazuje partiju pod prstom.
 */
export function RatingChart({ points, initialRating }: RatingChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const geometry = useMemo(() => {
    const values = [initialRating, ...points.map((point) => point.rating)];
    const [min, max] = niceBounds(values);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    // Indeks 0 je početni rejting prije prve partije.
    const x = (index: number) => PAD.left + (points.length ? (index / points.length) * innerW : 0);
    const y = (value: number) => PAD.top + (1 - (value - min) / (max - min)) * innerH;
    const ticks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4);
    const path = [`M${x(0)},${y(initialRating)}`, ...points.map((p, i) => `L${x(i + 1)},${y(p.rating)}`)].join(" ");
    const seasonStarts = points
      .map((point, index) => ({ index, season: point.season }))
      .filter((item, i, all) => i > 0 && all[i - 1].season !== item.season);
    const peakIndex = points.reduce((best, p, i) => (p.rating > points[best].rating ? i : best), 0);
    return { x, y, ticks, path, seasonStarts, peakIndex };
  }, [points, initialRating]);

  if (points.length < 2) {
    return (
      <p className="text-[13px] text-subtle">Graf se prikazuje nakon barem dvije završene partije.</p>
    );
  }

  const { x, y, ticks, path, seasonStarts, peakIndex } = geometry;
  const current = active === null ? null : points[active];

  function handlePointer(event: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * W;
    const ratio = (svgX - PAD.left) / (W - PAD.left - PAD.right);
    const index = Math.round(ratio * points.length) - 1;
    setActive(Math.max(0, Math.min(points.length - 1, index)));
  }

  const tooltipLeft = active === null ? 0 : (x(active + 1) / W) * 100;

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-pan-y select-none"
          role="img"
          aria-label={`Rejting kroz ${points.length} ${plural(points.length, "partiju", "partije", "partija")}, od ${Math.round(points[0].rating)} do ${Math.round(points[points.length - 1].rating)}`}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} className="stroke-white/6" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(tick) + 4} textAnchor="end" className="fill-dim text-[11px]">
                {Math.round(tick)}
              </text>
            </g>
          ))}

          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(initialRating)}
            y2={y(initialRating)}
            className="stroke-subtle/40"
            strokeDasharray="2 4"
            strokeWidth={1}
          />

          {seasonStarts.map(({ index, season }) => (
            <g key={season}>
              <line
                x1={x(index + 0.5)}
                x2={x(index + 0.5)}
                y1={PAD.top}
                y2={H - PAD.bottom}
                className="stroke-subtle/35"
                strokeDasharray="4 4"
              />
              <text x={x(index + 0.5) + 4} y={H - 8} className="fill-muted text-[11px]">
                {season}
              </text>
            </g>
          ))}

          <path d={path} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          <circle
            cx={x(peakIndex + 1)}
            cy={y(points[peakIndex].rating)}
            r={4.5}
            className="fill-accent stroke-sheet"
            strokeWidth={2}
          />

          {current && active !== null ? (
            <g pointerEvents="none">
              <line x1={x(active + 1)} x2={x(active + 1)} y1={PAD.top} y2={H - PAD.bottom} className="stroke-ink/30" strokeWidth={1} />
              <circle cx={x(active + 1)} cy={y(current.rating)} r={5} className="fill-accent-soft stroke-sheet" strokeWidth={2} />
            </g>
          ) : null}
        </svg>

        {current ? (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-[10px] border border-white/10 bg-sheet/95 px-2.5 py-1.5 text-[11.5px] shadow-lg"
            style={{ left: `${Math.min(85, Math.max(15, tooltipLeft))}%` }}
          >
            <p className="font-bold text-heading">
              {Math.round(current.rating)}{" "}
              <span className={current.delta >= 0 ? "text-ok" : "text-danger"}>{signed(current.delta)}</span>
            </p>
            <p className="text-muted">
              {formatDate(current.createdAt)} · {current.won ? "pobjeda" : "poraz"}
            </p>
          </div>
        ) : null}
      </div>

      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-accent" /> vrh {Math.round(points[peakIndex].rating)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block w-4 border-t border-dashed border-subtle/60" /> početni rejting {initialRating}
        </span>
        {seasonStarts.length ? <span>isprekidane okomice = nova sezona</span> : null}
      </figcaption>

      <details className="text-[12px] text-subtle">
        <summary className="cursor-pointer text-muted">Prikaži kao tablicu</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-muted">
            <tr>
              <th className="py-1 font-semibold">Datum</th>
              <th className="py-1 font-semibold">Ishod</th>
              <th className="py-1 text-right font-semibold">Promjena</th>
              <th className="py-1 text-right font-semibold">Rejting</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((point) => (
              <tr key={point.gameId} className="border-t border-white/5">
                <td className="py-1">{formatDate(point.createdAt)}</td>
                <td className="py-1">{point.won ? "W" : "L"}</td>
                <td className="py-1 text-right font-mono">{signed(point.delta)}</td>
                <td className="py-1 text-right font-mono text-ink">{Math.round(point.rating)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
