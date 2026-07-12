"use client";

import { useState, type ReactNode } from "react";

interface RevealListProps {
  items: ReactNode[];
  pageSize?: number;
  /** Classes for the wrapper that holds the visible rows (spacing, etc). */
  listClassName?: string;
}

/**
 * Renders a long, already-computed list in pages: only `pageSize` rows show
 * initially, "Prikaži još" reveals another `pageSize`, and the button vanishes
 * once everything is visible. Rows are pre-rendered on the server and revealed
 * client-side, so paging is instant (no extra requests).
 */
export function RevealList({ items, pageSize = 20, listClassName }: RevealListProps) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const hasMore = visibleCount < items.length;

  return (
    <>
      <div className={listClassName}>{items.slice(0, visibleCount)}</div>
      {hasMore ? (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + pageSize)}
          className="mt-4 w-full rounded-[12px] border border-[rgba(169,194,179,0.3)] bg-[rgba(6,20,16,0.4)] py-2.5 text-center text-[13px] font-bold text-[#dcece3]"
        >
          Prikaži još ({items.length - visibleCount})
        </button>
      ) : null}
    </>
  );
}
