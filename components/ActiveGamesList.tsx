"use client";

import Link from "next/link";
import { useState } from "react";

interface ActiveGameRow {
  id: string;
  createdAt: string;
  teamA: string;
  teamB: string;
  score: { teamA: number; teamB: number };
  roundsCount: number;
}

export function ActiveGamesList({ initialGames }: { initialGames: ActiveGameRow[] }) {
  const [games, setGames] = useState(initialGames);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ActiveGameRow | null>(null);
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [error, setError] = useState("");

  function askDelete(game: ActiveGameRow) {
    setConfirmTarget(game);
    setConfirmStep(1);
  }

  async function deleteGameConfirmed() {
    if (!confirmTarget) return;
    if (confirmStep === 1) {
      setConfirmStep(2);
      return;
    }
    const game = confirmTarget;
    setDeletingId(game.id);
    setError("");
    const response = await fetch(`/api/games/${game.id}`, {
      method: "DELETE",
    });
    setDeletingId(null);
    setConfirmTarget(null);
    setConfirmStep(1);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Greška pri brisanju partije");
      return;
    }
    setGames((prev) => prev.filter((row) => row.id !== game.id));
  }

  return (
    <div className="mt-4 space-y-4">
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {games.length === 0 ? (
        <section className="card p-4 text-sm text-emerald-100/90">
          Trenutno nema aktivnih partija.
        </section>
      ) : (
        games.map((game) => (
          <section key={game.id} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">
                Partija {new Date(game.createdAt).toLocaleString("hr-HR")}
              </p>
              <div className="flex gap-2">
                <Link
                  href={`/game/${game.id}`}
                  className="rounded-lg border border-emerald-500 px-2 py-1 text-xs font-semibold text-emerald-100"
                >
                  Otvori
                </Link>
                <button
                  type="button"
                  onClick={() => askDelete(game)}
                  disabled={deletingId === game.id}
                  className="rounded-lg border border-rose-400/70 px-2 py-1 text-xs font-semibold text-rose-200 disabled:opacity-60"
                >
                  {deletingId === game.id ? "Brišem..." : "Obriši"}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-emerald-950/40 p-3 text-sm text-emerald-100">
              <p className="font-semibold text-white">Tim A: {game.teamA}</p>
              <p className="mt-1 font-semibold text-white">Tim B: {game.teamB}</p>
              <p className="mt-1 text-emerald-300">
                Rezultat: A {game.score.teamA} : {game.score.teamB} B
              </p>
              <p className="mt-1 text-xs text-emerald-200/80">Ruke: {game.roundsCount}</p>
            </div>
          </section>
        ))
      )}

      {confirmTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-600/50 bg-emerald-950 p-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Potvrda brisanja</h3>
            <p className="mt-2 text-sm text-emerald-100">
              {confirmStep === 1
                ? `Želiš li obrisati aktivnu partiju od ${new Date(confirmTarget.createdAt).toLocaleString("hr-HR")}?`
                : "Jesi li stvarno siguran? Ova radnja trajno briše partiju i sve njezine ruke."}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmTarget(null);
                  setConfirmStep(1);
                }}
                className="rounded-lg border border-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-100"
              >
                Odustani
              </button>
              <button
                type="button"
                onClick={() => void deleteGameConfirmed()}
                disabled={deletingId === confirmTarget.id}
                className="rounded-lg border border-rose-400/70 bg-rose-900/30 px-3 py-2 text-sm font-semibold text-rose-200 disabled:opacity-60"
              >
                {confirmStep === 1 ? "Nastavi" : deletingId === confirmTarget.id ? "Brišem..." : "Obriši trajno"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
