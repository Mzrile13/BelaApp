"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import type { Player } from "@/lib/types";

interface PlayersPayload {
  players: Player[];
}

export default function NewGamePage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [error, setError] = useState("");
  const [newUsername, setNewUsername] = useState("");

  const [form, setForm] = useState({
    dealerPlayerId: "",
    teamA: ["", ""] as [string, string],
    teamB: ["", ""] as [string, string],
  });

  const selectedInTeams = useMemo(
    () =>
      [...form.teamA, ...form.teamB].filter((value) => value.length > 0),
    [form],
  );
  const playersOptionsKey = useMemo(
    () => players.map((player) => player.id).join("|"),
    [players],
  );

  async function loadPlayers() {
    const response = await fetch(`/api/players?t=${Date.now()}`, { cache: "no-store" });
    const data = (await response.json()) as PlayersPayload;
    setPlayers(data.players ?? []);
    if (!form.dealerPlayerId && data.players?.[0]) {
      setForm((prev) => ({ ...prev, dealerPlayerId: data.players[0].id }));
    }
  }

  useEffect(() => {
    void loadPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createPlayer() {
    const username = newUsername.trim();
    if (!username) {
      setError("Upiši username prije dodavanja.");
      return;
    }
    setCreatingPlayer(true);
    setError("");
    const response = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    setCreatingPlayer(false);

    if (response.ok) {
      setNewUsername("");
      await loadPlayers();
      return;
    }

    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setError(body.error ?? "Greška pri dodavanju igrača");
  }

  async function createGame() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Greška pri kreiranju partije");
      return;
    }

    const body = (await response.json()) as { game: { id: string } };
    router.push(`/game/${body.game.id}`);
  }

  function playerOption(player: Player, currentValue: string) {
    const isTakenInAnotherTeamSlot =
      selectedInTeams.includes(player.id) && currentValue !== player.id;
    return (
      <option
        key={player.id}
        value={player.id}
        disabled={isTakenInAnotherTeamSlot}
      >
        {player.username}
      </option>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/" className="mb-3" />
      <section className="card p-4">
        <h1 className="text-xl font-bold text-white">Nova partija</h1>
        <p className="text-sm text-emerald-100/90">
          Odaberi 4 igrača, timove i tko prvi dijeli.
        </p>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void createPlayer();
          }}
        >
          <input
            value={newUsername}
            onChange={(event) => setNewUsername(event.target.value)}
            className="w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
            placeholder="Novi username"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <button
            type="submit"
            disabled={creatingPlayer}
            className="rounded-xl bg-lime-400 px-4 font-semibold text-emerald-950 disabled:opacity-60"
          >
            {creatingPlayer ? "Dodajem..." : "Dodaj"}
          </button>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 text-sm text-emerald-100">
            Prvi djelitelj
            <select
              key={`dealer-${playersOptionsKey}`}
              value={form.dealerPlayerId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, dealerPlayerId: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
            >
              <option value="">Odaberi igrača</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.username}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-emerald-100">
            Tim A - Igrač 1
            <select
              key={`teamA-0-${playersOptionsKey}`}
              className="mt-1 w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
              value={form.teamA[0]}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, teamA: [event.target.value, prev.teamA[1]] }))
              }
            >
              <option value="">Odaberi</option>
              {players.map((player) => playerOption(player, form.teamA[0]))}
            </select>
          </label>
          <label className="text-sm text-emerald-100">
            Tim A - Igrač 2
            <select
              key={`teamA-1-${playersOptionsKey}`}
              className="mt-1 w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
              value={form.teamA[1]}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, teamA: [prev.teamA[0], event.target.value] }))
              }
            >
              <option value="">Odaberi</option>
              {players.map((player) => playerOption(player, form.teamA[1]))}
            </select>
          </label>
          <label className="text-sm text-emerald-100">
            Tim B - Igrač 1
            <select
              key={`teamB-0-${playersOptionsKey}`}
              className="mt-1 w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
              value={form.teamB[0]}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, teamB: [event.target.value, prev.teamB[1]] }))
              }
            >
              <option value="">Odaberi</option>
              {players.map((player) => playerOption(player, form.teamB[0]))}
            </select>
          </label>
          <label className="text-sm text-emerald-100">
            Tim B - Igrač 2
            <select
              key={`teamB-1-${playersOptionsKey}`}
              className="mt-1 w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
              value={form.teamB[1]}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, teamB: [prev.teamB[0], event.target.value] }))
              }
            >
              <option value="">Odaberi</option>
              {players.map((player) => playerOption(player, form.teamB[1]))}
            </select>
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        <button
          type="button"
          onClick={createGame}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-lime-400 py-3 font-semibold text-emerald-950 disabled:opacity-60"
        >
          {loading ? "Kreiram..." : "Pokreni partiju"}
        </button>
      </section>
    </main>
  );
}
