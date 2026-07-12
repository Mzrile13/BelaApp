"use client";

import { useState } from "react";
import Link from "next/link";
import type { HistoryRow } from "@/lib/history";

function HistoryCard({ row }: { row: HistoryRow }) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[#f2f5f0]">
          Partija {new Date(row.createdAt).toLocaleString("hr-HR")}
        </p>
        <Link
          href={`/game/${row.id}?from=history`}
          className="rounded-lg border border-[rgba(169,194,179,0.3)] px-2 py-1 text-xs font-semibold text-[#dcece3]"
        >
          Otvori
        </Link>
      </div>
      <div className="rounded-[14px] bg-[rgba(6,20,16,0.45)] p-3 text-sm text-[#dcece3]">
        <p
          className={`font-semibold ${
            row.winnerTeam === "B" ? "text-[#8fa89b]" : "text-[#f7fbf6]"
          }`}
        >
          Tim A: {row.teamA.join(" + ")}
          {row.winnerTeam === "A" ? (
            <span className="ml-2 rounded-full bg-[rgba(201,217,160,0.2)] px-2 py-0.5 text-xs text-[#c9d9a0]">
              pobjednik
            </span>
          ) : null}
        </p>
        <p
          className={`mt-1 font-semibold ${
            row.winnerTeam === "A" ? "text-[#8fa89b]" : "text-[#f7fbf6]"
          }`}
        >
          Tim B: {row.teamB.join(" + ")}
          {row.winnerTeam === "B" ? (
            <span className="ml-2 rounded-full bg-[rgba(201,217,160,0.2)] px-2 py-0.5 text-xs text-[#c9d9a0]">
              pobjednik
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-[#8fa89b]">
          Rezultat: A {row.scoreA} : {row.scoreB} B
        </p>
      </div>
    </section>
  );
}

interface HistoryListProps {
  initialRows: HistoryRow[];
  initialHasMore: boolean;
  initialNextOffset: number;
  pageSize: number;
}

export function HistoryList({
  initialRows,
  initialHasMore,
  initialNextOffset,
  pageSize,
}: HistoryListProps) {
  const [rows, setRows] = useState(initialRows);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [offset, setOffset] = useState(initialNextOffset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadMore() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/games/history?offset=${offset}&limit=${pageSize}`);
      if (!response.ok) {
        setError("Greška pri učitavanju.");
        return;
      }
      const page = (await response.json()) as {
        rows: HistoryRow[];
        hasMore: boolean;
        nextOffset: number;
      };
      setRows((prev) => [...prev, ...page.rows]);
      setHasMore(page.hasMore);
      setOffset(page.nextOffset);
    } catch {
      setError("Greška pri učitavanju.");
    } finally {
      setLoading(false);
    }
  }

  if (rows.length === 0 && !hasMore) {
    return (
      <section className="card p-4 text-sm text-[#a9c2b3]">Još nema odigranih rundi.</section>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {rows.map((row) => (
          <HistoryCard key={row.id} row={row} />
        ))}
      </div>

      {error ? <p className="mt-3 text-[13px] font-semibold text-rose-300">{error}</p> : null}

      {hasMore ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mt-4 w-full rounded-[12px] border border-[rgba(169,194,179,0.3)] bg-[rgba(6,20,16,0.4)] py-2.5 text-center text-[13px] font-bold text-[#dcece3] disabled:opacity-60"
        >
          {loading ? "Učitavam..." : "Prikaži još"}
        </button>
      ) : null}
    </>
  );
}
