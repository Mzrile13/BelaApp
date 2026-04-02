"use client";

import { useMemo, useState } from "react";
import { SuitBadge } from "@/components/SuitBadge";
import type { CalledSuit, Game, Player, Round } from "@/lib/types";

interface RoundEntryFormProps {
  game: Game;
  players: Player[];
  onSaved: (result: {
    gameFinished: boolean;
    winnerTeam?: "A" | "B" | null;
    score?: { teamA: number; teamB: number };
  }) => Promise<void> | void;
  onCancel?: () => void;
  dealerName?: string;
  initialRound?: Round;
  submitEndpoint?: string;
  submitMethod?: "POST" | "PATCH";
  submitLabel?: string;
}

type PointsField = "pointsTeamA" | "pointsTeamB";
type ZvanjaValue = 20 | 50 | 100 | 150 | 200;

const keypadRows = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["0"],
];
const calledSuits: CalledSuit[] = ["karo", "herc", "pik", "tref"];

export function RoundEntryForm({
  game,
  players,
  onSaved,
  onCancel,
  dealerName,
  initialRound,
  submitEndpoint = "/api/rounds",
  submitMethod = "POST",
  submitLabel = "Spremi ruku",
}: RoundEntryFormProps) {
  const allPlayers = useMemo(
    () => [...game.teams.teamA, ...game.teams.teamB],
    [game.teams.teamA, game.teams.teamB],
  );
  const teamAPlayers = useMemo(
    () => players.filter((player) => game.teams.teamA.includes(player.id)),
    [players, game.teams.teamA],
  );
  const teamBPlayers = useMemo(
    () => players.filter((player) => game.teams.teamB.includes(player.id)),
    [players, game.teams.teamB],
  );

  const initialTokensA = useMemo(() => {
    const map: Record<string, ZvanjaValue[]> = {};
    for (const player of teamAPlayers) {
      const fromArray = (initialRound?.zvanjaByPlayerA ?? []).find(
        (entry) => entry.playerId === player.id,
      );
      const fallback =
        initialRound?.zvanjaPlayerIdA === player.id ? (initialRound?.zvanjaTeamA ?? 0) : 0;
      const points = fromArray?.points ?? fallback;
      map[player.id] = points > 0 ? [points as ZvanjaValue] : [];
    }
    return map;
  }, [initialRound, teamAPlayers]);

  const initialTokensB = useMemo(() => {
    const map: Record<string, ZvanjaValue[]> = {};
    for (const player of teamBPlayers) {
      const fromArray = (initialRound?.zvanjaByPlayerB ?? []).find(
        (entry) => entry.playerId === player.id,
      );
      const fallback =
        initialRound?.zvanjaPlayerIdB === player.id ? (initialRound?.zvanjaTeamB ?? 0) : 0;
      const points = fromArray?.points ?? fallback;
      map[player.id] = points > 0 ? [points as ZvanjaValue] : [];
    }
    return map;
  }, [initialRound, teamBPlayers]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    callerPlayerId: initialRound?.callerPlayerId ?? allPlayers[0] ?? "",
    calledSuit: initialRound?.calledSuit ?? ("karo" as CalledSuit),
    pointsTeamA: initialRound?.pointsTeamA ?? 0,
    pointsTeamB: initialRound?.pointsTeamB ?? 0,
    zvanjaTeamA: initialRound?.zvanjaTeamA ?? 0,
    zvanjaTeamB: initialRound?.zvanjaTeamB ?? 0,
    zvanjaPlayerIdA: initialRound?.zvanjaPlayerIdA ?? (null as string | null),
    zvanjaPlayerIdB: initialRound?.zvanjaPlayerIdB ?? (null as string | null),
    stigliaTeam: initialRound?.stigliaTeam ?? (null as "A" | "B" | null),
  });
  const [zvanjaTokensByPlayerA, setZvanjaTokensByPlayerA] = useState<
    Record<string, ZvanjaValue[]>
  >(initialTokensA);
  const [zvanjaTokensByPlayerB, setZvanjaTokensByPlayerB] = useState<
    Record<string, ZvanjaValue[]>
  >(initialTokensB);
  const [activePointsField, setActivePointsField] = useState<PointsField>(
    (initialRound?.pointsTeamB ?? 0) > (initialRound?.pointsTeamA ?? 0)
      ? "pointsTeamB"
      : "pointsTeamA",
  );
  const [activeZvanjaPlayerId, setActiveZvanjaPlayerId] = useState<string>(
    teamAPlayers.find((player) => (initialTokensA[player.id] ?? []).length > 0)?.id ??
      teamBPlayers.find((player) => (initialTokensB[player.id] ?? []).length > 0)?.id ??
      teamAPlayers[0]?.id ??
      teamBPlayers[0]?.id ??
      "",
  );

  async function submit() {
    if (form.pointsTeamA + form.pointsTeamB > 162) {
      setError("Zbroj bodova iz čiste igre ne može biti veći od 162");
      return;
    }

    setLoading(true);
    setError("");
    const response = await fetch(submitEndpoint, {
      method: submitMethod,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        gameId: game.id,
        zvanjaByPlayerA: teamAPlayers.map((player) => ({
          playerId: player.id,
          points: (zvanjaTokensByPlayerA[player.id] ?? []).reduce((sum, value) => sum + value, 0),
        })),
        zvanjaByPlayerB: teamBPlayers.map((player) => ({
          playerId: player.id,
          points: (zvanjaTokensByPlayerB[player.id] ?? []).reduce((sum, value) => sum + value, 0),
        })),
      }),
    });
    setLoading(false);

    let body: {
      error?: string;
      gameFinished?: boolean;
      winnerTeam?: "A" | "B" | null;
      score?: { teamA: number; teamB: number };
    } = {};
    try {
      body = (await response.json()) as { error?: string; gameFinished?: boolean };
    } catch {
      body = {};
    }

    if (!response.ok) {
      setError(body.error ?? "Greška pri spremanju ruke");
      return;
    }

    await onSaved({
      gameFinished: body.gameFinished === true,
      winnerTeam: body.winnerTeam ?? null,
      score: body.score,
    });
  }

  function setPoints(field: PointsField, value: number) {
    const clamped = Math.max(0, Math.min(162, value));
    const nextPointsTeamA = field === "pointsTeamA" ? clamped : 162 - clamped;
    const nextPointsTeamB = field === "pointsTeamB" ? clamped : 162 - clamped;
    setForm((prev) => ({
      ...prev,
      pointsTeamA: nextPointsTeamA,
      pointsTeamB: nextPointsTeamB,
      stigliaTeam:
        prev.stigliaTeam === "A" && nextPointsTeamA !== 162
          ? null
          : prev.stigliaTeam === "B" && nextPointsTeamB !== 162
            ? null
            : prev.stigliaTeam,
    }));
  }

  function appendDigitToPoints(digit: string) {
    const current = form[activePointsField];
    const next = Number(`${current}${digit}`);
    setPoints(activePointsField, Number.isFinite(next) ? next : current);
  }

  function backspacePoints() {
    const current = String(form[activePointsField]);
    const trimmed = current.length <= 1 ? 0 : Number(current.slice(0, -1));
    setPoints(activePointsField, trimmed);
  }

  function clearPoints() {
    setForm((prev) => ({ ...prev, pointsTeamA: 0, pointsTeamB: 0, stigliaTeam: null }));
  }

  function applyStigliaForActivePointsTeam() {
    const isTeamAActive = activePointsField === "pointsTeamA";
    setForm((prev) => ({
      ...prev,
      pointsTeamA: isTeamAActive ? 162 : 0,
      pointsTeamB: isTeamAActive ? 0 : 162,
      stigliaTeam: isTeamAActive ? "A" : "B",
    }));
  }

  function syncZvanja(
    tokensByPlayerA: Record<string, ZvanjaValue[]>,
    tokensByPlayerB: Record<string, ZvanjaValue[]>,
  ) {
    const totalA = teamAPlayers.reduce(
      (sum, player) =>
        sum +
        (tokensByPlayerA[player.id] ?? []).reduce((inner, value) => inner + value, 0),
      0,
    );
    const totalB = teamBPlayers.reduce(
      (sum, player) =>
        sum +
        (tokensByPlayerB[player.id] ?? []).reduce((inner, value) => inner + value, 0),
      0,
    );

    const topPlayerA = teamAPlayers
      .map((player) => ({
        playerId: player.id,
        points: (tokensByPlayerA[player.id] ?? []).reduce((s, v) => s + v, 0),
      }))
      .sort((a, b) => b.points - a.points)[0];
    const topPlayerB = teamBPlayers
      .map((player) => ({
        playerId: player.id,
        points: (tokensByPlayerB[player.id] ?? []).reduce((s, v) => s + v, 0),
      }))
      .sort((a, b) => b.points - a.points)[0];

    setForm((prev) => ({
      ...prev,
      zvanjaTeamA: totalA,
      zvanjaTeamB: totalB,
      zvanjaPlayerIdA: totalA === 0 ? null : (topPlayerA?.playerId ?? null),
      zvanjaPlayerIdB: totalB === 0 ? null : (topPlayerB?.playerId ?? null),
    }));
  }

  function applyZvanja(value: ZvanjaValue) {
    const isTeamA = game.teams.teamA.includes(activeZvanjaPlayerId);
    const sourceMap = isTeamA ? zvanjaTokensByPlayerA : zvanjaTokensByPlayerB;
    const source = sourceMap[activeZvanjaPlayerId] ?? [];
    let next = source;

    if (value === 150 || value === 200) {
      next = source.includes(value)
        ? source.filter((entry) => entry !== value)
        : [...source, value];
    } else {
      next = [...source, value];
    }

    if (isTeamA) {
      const nextMap = { ...zvanjaTokensByPlayerA, [activeZvanjaPlayerId]: next };
      setZvanjaTokensByPlayerA(nextMap);
      syncZvanja(nextMap, zvanjaTokensByPlayerB);
      return;
    }

    const nextMap = { ...zvanjaTokensByPlayerB, [activeZvanjaPlayerId]: next };
    setZvanjaTokensByPlayerB(nextMap);
    syncZvanja(zvanjaTokensByPlayerA, nextMap);
  }

  function clearZvanjaForActivePlayer() {
    const isTeamA = game.teams.teamA.includes(activeZvanjaPlayerId);
    if (isTeamA) {
      const nextMap = { ...zvanjaTokensByPlayerA, [activeZvanjaPlayerId]: [] };
      setZvanjaTokensByPlayerA(nextMap);
      syncZvanja(nextMap, zvanjaTokensByPlayerB);
      return;
    }
    const nextMap = { ...zvanjaTokensByPlayerB, [activeZvanjaPlayerId]: [] };
    setZvanjaTokensByPlayerB(nextMap);
    syncZvanja(zvanjaTokensByPlayerA, nextMap);
  }

  return (
    <section className="rounded-2xl border border-emerald-700/40 bg-emerald-900/50 p-4 shadow-xl shadow-emerald-950/30">
      <h2 className="mb-3 text-lg font-semibold text-white">Unos nove ruke</h2>
      {dealerName ? (
        <p className="mb-3 text-base font-semibold text-emerald-100">Dijeli: {dealerName}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 text-base font-semibold text-emerald-100">
          <p>Tko je zvao</p>
          <div className="mt-2 grid grid-cols-1 gap-3">
            <div className="rounded-lg border border-emerald-700/50 bg-emerald-900/30 p-2">
              <p className="mb-2 text-sm font-bold text-emerald-200">Tim A</p>
              <div className="grid grid-cols-2 gap-2">
                {teamAPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, callerPlayerId: player.id }))}
                    className={`rounded-lg border px-3 py-2 text-left ${
                      form.callerPlayerId === player.id
                        ? "border-lime-300 bg-emerald-700/70"
                        : "border-emerald-700/50 bg-emerald-900/40"
                    }`}
                  >
                    <p className="text-base font-bold text-white">{player.username}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-emerald-700/50 bg-emerald-900/30 p-2">
              <p className="mb-2 text-sm font-bold text-emerald-200">Tim B</p>
              <div className="grid grid-cols-2 gap-2">
                {teamBPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, callerPlayerId: player.id }))}
                    className={`rounded-lg border px-3 py-2 text-left ${
                      form.callerPlayerId === player.id
                        ? "border-lime-300 bg-emerald-700/70"
                        : "border-emerald-700/50 bg-emerald-900/40"
                    }`}
                  >
                    <p className="text-base font-bold text-white">{player.username}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2 text-base font-semibold text-emerald-100">
          <p>Zvani znak</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {calledSuits.map((suit) => (
              <button
                key={suit}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, calledSuit: suit }))}
                className="text-left"
              >
                <SuitBadge suit={suit} selected={form.calledSuit === suit} />
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActivePointsField("pointsTeamA")}
          className={`rounded-xl border p-3 text-left ${
            activePointsField === "pointsTeamA"
              ? "border-lime-300 bg-emerald-800/80"
              : "border-emerald-600/50 bg-emerald-950/40"
          }`}
        >
          <p className="text-sm text-emerald-200">Bodovi Tim A</p>
          <p className="text-4xl font-extrabold text-white">{form.pointsTeamA}</p>
        </button>
        <button
          type="button"
          onClick={() => setActivePointsField("pointsTeamB")}
          className={`rounded-xl border p-3 text-left ${
            activePointsField === "pointsTeamB"
              ? "border-lime-300 bg-emerald-800/80"
              : "border-emerald-600/50 bg-emerald-950/40"
          }`}
        >
          <p className="text-sm text-emerald-200">Bodovi Tim B</p>
          <p className="text-4xl font-extrabold text-white">{form.pointsTeamB}</p>
        </button>

        <div className="col-span-2 rounded-xl border border-emerald-600/50 bg-emerald-950/40 p-3">
          <div className="space-y-2">
            {keypadRows.slice(0, 3).map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="grid grid-cols-3 gap-2">
                {row.map((digit) => (
                  <button
                    type="button"
                    key={digit}
                    onClick={() => appendDigitToPoints(digit)}
                    className="rounded-lg bg-emerald-800/80 py-3 text-lg font-bold text-emerald-50"
                  >
                    {digit}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => appendDigitToPoints("0")}
              className="rounded-lg bg-emerald-800/80 py-3 text-lg font-bold text-emerald-50"
            >
              0
            </button>
            <button
              type="button"
              onClick={backspacePoints}
              className="rounded-lg bg-emerald-700 py-3 text-base font-semibold text-emerald-50"
            >
              Del
            </button>
            <button
              type="button"
              onClick={clearPoints}
              className="rounded-lg bg-emerald-700 py-3 text-base font-semibold text-emerald-50"
            >
              Clear
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveZvanjaPlayerId(teamAPlayers[0]?.id ?? "")}
          className={`rounded-xl border p-3 text-left ${
            game.teams.teamA.includes(activeZvanjaPlayerId)
              ? "border-lime-300 bg-emerald-800/80"
              : "border-emerald-600/50 bg-emerald-950/40"
          }`}
        >
          <p className="text-sm text-emerald-200">Zvanja Tim A</p>
          <p className="text-3xl font-extrabold text-white">{form.zvanjaTeamA}</p>
          <p className="mt-1 text-sm text-emerald-300/90">
            {teamAPlayers
              .map((player) => ({
                username: player.username,
                total: (zvanjaTokensByPlayerA[player.id] ?? []).reduce(
                  (sum, value) => sum + value,
                  0,
                ),
              }))
              .filter((entry) => entry.total > 0)
              .map((entry) => `${entry.username}: ${entry.total}`)
              .join(" | ") || "Nema zvanja"}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setActiveZvanjaPlayerId(teamBPlayers[0]?.id ?? "")}
          className={`rounded-xl border p-3 text-left ${
            game.teams.teamB.includes(activeZvanjaPlayerId)
              ? "border-lime-300 bg-emerald-800/80"
              : "border-emerald-600/50 bg-emerald-950/40"
          }`}
        >
          <p className="text-sm text-emerald-200">Zvanja Tim B</p>
          <p className="text-3xl font-extrabold text-white">{form.zvanjaTeamB}</p>
          <p className="mt-1 text-sm text-emerald-300/90">
            {teamBPlayers
              .map((player) => ({
                username: player.username,
                total: (zvanjaTokensByPlayerB[player.id] ?? []).reduce(
                  (sum, value) => sum + value,
                  0,
                ),
              }))
              .filter((entry) => entry.total > 0)
              .map((entry) => `${entry.username}: ${entry.total}`)
              .join(" | ") || "Nema zvanja"}
          </p>
        </button>

        <div className="col-span-2 rounded-xl border border-emerald-600/50 bg-emerald-950/40 p-3">
          <p className="mb-2 text-sm font-semibold text-emerald-200">
            Odaberi igrača kojem upisuješ zvanje
          </p>
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-lg border border-emerald-700/50 bg-emerald-900/30 p-2">
              <p className="mb-2 text-sm font-bold text-emerald-200">Tim A</p>
              <div className="grid grid-cols-2 gap-2">
                {teamAPlayers.map((player) => {
                  const playerTotal = (zvanjaTokensByPlayerA[player.id] ?? []).reduce(
                    (sum, value) => sum + value,
                    0,
                  );
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setActiveZvanjaPlayerId(player.id)}
                      className={`rounded-lg border px-3 py-2 text-left ${
                        activeZvanjaPlayerId === player.id
                          ? "border-lime-300 bg-emerald-700/70"
                          : "border-emerald-700/50 bg-emerald-900/40"
                      }`}
                    >
                      <p className="text-base font-bold text-white">{player.username}</p>
                      <p className="text-xs text-emerald-200">Zvanje: {playerTotal}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-emerald-700/50 bg-emerald-900/30 p-2">
              <p className="mb-2 text-sm font-bold text-emerald-200">Tim B</p>
              <div className="grid grid-cols-2 gap-2">
                {teamBPlayers.map((player) => {
                  const playerTotal = (zvanjaTokensByPlayerB[player.id] ?? []).reduce(
                    (sum, value) => sum + value,
                    0,
                  );
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setActiveZvanjaPlayerId(player.id)}
                      className={`rounded-lg border px-3 py-2 text-left ${
                        activeZvanjaPlayerId === player.id
                          ? "border-lime-300 bg-emerald-700/70"
                          : "border-emerald-700/50 bg-emerald-900/40"
                      }`}
                    >
                      <p className="text-base font-bold text-white">{player.username}</p>
                      <p className="text-xs text-emerald-200">Zvanje: {playerTotal}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2 rounded-xl border border-emerald-600/50 bg-emerald-950/40 p-3">
          <div className="grid grid-cols-5 gap-2">
            {[20, 50, 100, 150, 200].map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => applyZvanja(value as ZvanjaValue)}
                className="rounded-lg bg-emerald-800/80 py-3 text-base font-semibold text-emerald-50"
              >
                +{value}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={applyStigliaForActivePointsTeam}
              className="rounded-lg bg-emerald-700 py-3 text-base font-semibold text-emerald-50"
            >
              Štiglja (+90) aktivni tim bodova
            </button>
            <div className="flex items-center justify-center rounded-lg border border-emerald-700/40 bg-emerald-900/30 px-3 py-2 text-sm font-semibold text-emerald-200">
              {form.stigliaTeam ? `Upisana: Tim ${form.stigliaTeam}` : "Nije upisana"}
            </div>
          </div>
          <button
            type="button"
            onClick={clearZvanjaForActivePlayer}
            className="mt-2 w-full rounded-lg bg-emerald-700 py-3 text-base font-semibold text-emerald-50"
          >
            Reset aktivnog igrača
          </button>
        </div>
      </div>

      {error ? <p className="mt-2 text-base font-semibold text-rose-300">{error}</p> : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-emerald-500 py-4 text-lg font-semibold text-emerald-100"
          >
            Nazad
          </button>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className={`rounded-xl bg-lime-400 py-4 text-lg font-bold text-emerald-950 disabled:opacity-60 ${
            onCancel ? "" : "col-span-2"
          }`}
        >
          {loading ? "Spremam..." : submitLabel}
        </button>
      </div>
    </section>
  );
}
