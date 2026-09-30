"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { HistoryFilterOptions, HistoryFilters, HistoryRow } from "@/lib/history";

function HistoryCard({ row }: { row: HistoryRow }) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-heading">
          Partija {new Date(row.createdAt).toLocaleString("hr-HR")}
        </p>
        <Link
          href={`/game/${row.id}?from=history`}
          className="rounded-lg border border-subtle/30 px-2 py-1 text-xs font-semibold text-soft"
        >
          Otvori
        </Link>
      </div>
      <div className="rounded-[14px] bg-well/45 p-3 text-sm text-soft">
        <p
          className={`font-semibold ${
            row.winnerTeam === "B" ? "text-muted" : "text-heading"
          }`}
        >
          Tim A: {row.teamA.join(" + ")}
          {row.winnerTeam === "A" ? (
            <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
              pobjednik
            </span>
          ) : null}
        </p>
        <p
          className={`mt-1 font-semibold ${
            row.winnerTeam === "A" ? "text-muted" : "text-heading"
          }`}
        >
          Tim B: {row.teamB.join(" + ")}
          {row.winnerTeam === "B" ? (
            <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
              pobjednik
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-muted">
          Rezultat: A {row.scoreA} : {row.scoreB} B
        </p>
        {row.comment ? (
          <p className="mt-2 whitespace-pre-wrap break-words border-t border-white/8 pt-2 text-[13px] italic text-accent">
            “{row.comment}”
          </p>
        ) : null}
      </div>
    </section>
  );
}

interface HistoryListProps {
  initialRows: HistoryRow[];
  initialHasMore: boolean;
  initialNextOffset: number;
  pageSize: number;
  filterOptions: HistoryFilterOptions;
  /** Povijest jednog igrača: igrač je fiksan, a izbornik igrača se skriva. */
  lockedPlayerId?: string;
}

const CONTROL_CLASS =
  "w-full rounded-[10px] border border-white/12 bg-well/60 px-3 py-2 text-[13px] text-ink disabled:opacity-50";
const LABEL_CLASS = "mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-muted";

function toQuery(filters: HistoryFilters, lockedPlayerId: string | undefined, offset: number, limit: number) {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  const effective = { ...filters, ...(lockedPlayerId ? { playerId: lockedPlayerId } : {}) };
  for (const [key, value] of Object.entries(effective)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export function HistoryList({
  initialRows,
  initialHasMore,
  initialNextOffset,
  pageSize,
  filterOptions,
  lockedPlayerId,
}: HistoryListProps) {
  const [rows, setRows] = useState(initialRows);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [offset, setOffset] = useState(initialNextOffset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const requestId = useRef(0);
  const firstRun = useRef(true);

  const activeCount = Object.values(filters).filter(Boolean).length;
  const hasSubject = !!(filters.pair || filters.playerId || lockedPlayerId);

  function setFilter<K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K] | "") {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === "" || value === undefined) delete next[key];
      else next[key] = value as HistoryFilters[K];
      // Pobjeda/poraz nema smisla bez igrača ili para na koje se odnosi.
      if (!next.pair && !next.playerId && !lockedPlayerId) delete next.result;
      return next;
    });
  }

  // Svaka promjena filtera dohvaća prvu stranicu iznova; upit za pretragu se
  // odgađa da se ne šalje zahtjev po svakom slovu. Zastarjeli odgovori se ignoriraju.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/games/history?${toQuery(filters, lockedPlayerId, 0, pageSize)}`);
        if (id !== requestId.current) return;
        if (!response.ok) {
          setError("Greška pri učitavanju.");
          return;
        }
        const page = (await response.json()) as {
          rows: HistoryRow[];
          hasMore: boolean;
          nextOffset: number;
        };
        setRows(page.rows);
        setHasMore(page.hasMore);
        setOffset(page.nextOffset);
      } catch {
        if (id === requestId.current) setError("Greška pri učitavanju.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, lockedPlayerId, pageSize]);

  async function loadMore() {
    const id = requestId.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/games/history?${toQuery(filters, lockedPlayerId, offset, pageSize)}`,
      );
      if (id !== requestId.current) return;
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

  const filterPanel = (
    <section className="card mb-4 p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
          aria-expanded={showFilters}
          className="rounded-full border-none bg-transparent p-0 text-sm font-bold text-accent"
        >
          {showFilters ? "▾" : "▸"} Filteri{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={() => setFilters({})}
            className="rounded-full border-none bg-transparent p-0 text-xs font-bold text-muted"
          >
            Očisti
          </button>
        ) : null}
      </div>
      {showFilters ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLASS} htmlFor="hf-from">Od datuma</label>
            <input
              id="hf-from"
              type="date"
              value={filters.from ?? ""}
              max={filters.to || undefined}
              onChange={(event) => setFilter("from", event.target.value)}
              className={CONTROL_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="hf-to">Do datuma</label>
            <input
              id="hf-to"
              type="date"
              value={filters.to ?? ""}
              min={filters.from || undefined}
              onChange={(event) => setFilter("to", event.target.value)}
              className={CONTROL_CLASS}
            />
          </div>
          {lockedPlayerId ? null : (
            <div>
              <label className={LABEL_CLASS} htmlFor="hf-player">Igrač</label>
              <select
                id="hf-player"
                value={filters.playerId ?? ""}
                onChange={(event) => setFilter("playerId", event.target.value)}
                className={CONTROL_CLASS}
              >
                <option value="">Svi</option>
                {filterOptions.players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.username}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={LABEL_CLASS} htmlFor="hf-pair">Par</label>
            <select
              id="hf-pair"
              value={filters.pair ?? ""}
              onChange={(event) => setFilter("pair", event.target.value)}
              className={CONTROL_CLASS}
            >
              <option value="">Svi</option>
              {filterOptions.pairs.map((pair) => (
                <option key={pair.key} value={pair.key}>
                  {pair.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="hf-result">Rezultat</label>
            <select
              id="hf-result"
              value={filters.result ?? ""}
              disabled={!hasSubject}
              onChange={(event) => setFilter("result", event.target.value as "win" | "loss" | "")}
              className={CONTROL_CLASS}
            >
              <option value="">Sve</option>
              <option value="win">Pobjede</option>
              <option value="loss">Porazi</option>
            </select>
            {hasSubject ? null : (
              <p className="mt-1 text-[11px] text-dim">Odaberi igrača ili par.</p>
            )}
          </div>
          <div className="col-span-2">
            <label className={LABEL_CLASS} htmlFor="hf-q">Pretraži komentare</label>
            <input
              id="hf-q"
              type="search"
              value={filters.q ?? ""}
              maxLength={100}
              onChange={(event) => setFilter("q", event.target.value)}
              placeholder="npr. štiglja"
              className={CONTROL_CLASS}
            />
          </div>
        </div>
      ) : null}
    </section>
  );

  let body;
  if (rows.length === 0 && !hasMore) {
    body = (
      <section className="card p-4 text-sm text-subtle">
        {loading
          ? "Učitavam..."
          : activeCount > 0
            ? "Nema partija za odabrane filtere."
            : "Još nema odigranih rundi."}
      </section>
    );
  } else {
    body = (
      <>
        <div className={`space-y-4 ${loading && rows.length > 0 ? "opacity-60" : ""}`}>
          {rows.map((row) => (
            <HistoryCard key={row.id} row={row} />
          ))}
        </div>

        {hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="mt-4 w-full rounded-[12px] border border-subtle/30 bg-well/40 py-2.5 text-center text-[13px] font-bold text-soft disabled:opacity-60"
          >
            {loading ? "Učitavam..." : "Prikaži još"}
          </button>
        ) : null}
      </>
    );
  }

  return (
    <>
      {filterPanel}
      {error ? <p className="mb-3 text-[13px] font-semibold text-rose-300">{error}</p> : null}
      {body}
    </>
  );
}
