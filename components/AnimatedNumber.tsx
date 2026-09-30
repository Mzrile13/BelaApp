"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  /** Ključ u sessionStorage pod kojim se pamti zadnja prikazana vrijednost. */
  storageKey: string;
  className?: string;
  durationMs?: number;
}

function readStored(key: string): number | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: number) {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    // Privatni prozor ili blokirana pohrana: samo nema animacije sljedeći put.
  }
}

/**
 * Broji od zadnje viđene vrijednosti do nove. Prvi posjet partiji nema
 * animacije, jer ne znamo od čega bi brojali.
 */
export function AnimatedNumber({ value, storageKey, className, durationMs = 700 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const [bump, setBump] = useState(false);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const from = readStored(storageKey);
    writeStored(storageKey, value);
    if (from === null || !Number.isFinite(from) || from === value) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) frame.current = requestAnimationFrame(step);
      else setBump(true);
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [value, storageKey, durationMs]);

  return (
    <span
      className={`${className ?? ""} inline-block ${bump ? "animate-score-bump" : ""}`}
      onAnimationEnd={() => setBump(false)}
    >
      {display}
    </span>
  );
}
