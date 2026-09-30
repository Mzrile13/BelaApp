"use client";

import { useMemo, useState } from "react";
import { CallerStep } from "@/components/round-entry/CallerStep";
import { PointsStep } from "@/components/round-entry/PointsStep";
import { type PointsField, type ZvanjaValue } from "@/components/round-entry/shared";
import { ZvanjaStep } from "@/components/round-entry/ZvanjaStep";
import { deriveInputPoints } from "@/lib/scoring";
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
  const teamAName = teamAPlayers.map((player) => player.username).join(" & ") || "Tim A";
  const teamBName = teamBPlayers.map((player) => player.username).join(" & ") || "Tim B";

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

  // Stored rounds keep computed display points (clean + zvanja + štiglja) in
  // pointsTeamA/B, so reconstruct the raw clean points for the entry fields.
  const initialCleanPoints = useMemo(
    () =>
      initialRound
        ? deriveInputPoints(initialRound)
        : { pointsTeamA: 0, pointsTeamB: 0 },
    [initialRound],
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    callerPlayerId: initialRound?.callerPlayerId ?? allPlayers[0] ?? "",
    calledSuit: initialRound?.calledSuit ?? ("karo" as CalledSuit),
    pointsTeamA: initialCleanPoints.pointsTeamA,
    pointsTeamB: initialCleanPoints.pointsTeamB,
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
    initialCleanPoints.pointsTeamB > initialCleanPoints.pointsTeamA
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
    <section className="flex flex-col gap-2 rounded-[22px] border border-white/5 bg-[radial-gradient(120%_60%_at_85%_-10%,rgba(201,217,160,0.08)_0%,transparent_55%),linear-gradient(165deg,#0d2a20_0%,#071a14_55%,#061410_100%)] p-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[16px] font-extrabold text-heading">Unos nove ruke</h2>
        {dealerName ? (
          <p className="text-[13px] font-semibold text-subtle">Dijeli: {dealerName}</p>
        ) : null}
      </div>

      <CallerStep
        teamAPlayers={teamAPlayers}
        teamBPlayers={teamBPlayers}
        callerPlayerId={form.callerPlayerId}
        calledSuit={form.calledSuit}
        onCallerChange={(playerId) => setForm((prev) => ({ ...prev, callerPlayerId: playerId }))}
        onSuitChange={(suit) => setForm((prev) => ({ ...prev, calledSuit: suit }))}
      />

      <ZvanjaStep
        teamAPlayers={teamAPlayers}
        teamBPlayers={teamBPlayers}
        tokensByPlayerA={zvanjaTokensByPlayerA}
        tokensByPlayerB={zvanjaTokensByPlayerB}
        zvanjaTeamA={form.zvanjaTeamA}
        zvanjaTeamB={form.zvanjaTeamB}
        activePlayerId={activeZvanjaPlayerId}
        onActivePlayerChange={setActiveZvanjaPlayerId}
        onAddZvanje={applyZvanja}
        onResetPlayer={clearZvanjaForActivePlayer}
      />

      <PointsStep
        teamAName={teamAName}
        teamBName={teamBName}
        pointsTeamA={form.pointsTeamA}
        pointsTeamB={form.pointsTeamB}
        activeField={activePointsField}
        onActiveFieldChange={setActivePointsField}
        onDigit={appendDigitToPoints}
        onBackspace={backspacePoints}
        onClear={clearPoints}
        stigliaTeam={form.stigliaTeam}
        onStiglia={applyStigliaForActivePointsTeam}
      />

      {error ? (
        <p role="alert" className="text-[14px] font-semibold text-rose-300">
          {error}
        </p>
      ) : null}

      {/* Ljepljivo na dnu ekrana: spremanje je uvijek na dohvat, bez skrolanja. */}
      <div className="sticky bottom-0 z-20 -mx-3 -mb-3 grid grid-cols-[1fr_1.6fr] gap-2 rounded-b-[22px] border-t border-white/5 bg-sheet px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[12px] border border-subtle/30 bg-well/60 py-2.5 text-center text-[13px] font-bold text-soft"
          >
            Nazad
          </button>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          aria-busy={loading}
          className={`btn-accent rounded-[12px] py-2.5 text-center text-[13px] font-extrabold disabled:opacity-60 ${
            onCancel ? "" : "col-span-2"
          }`}
        >
          {loading ? "Spremam..." : submitLabel}
        </button>
      </div>
    </section>
  );
}
