"use client";

import { useMemo, useState } from "react";
import { SuitBadge } from "@/components/SuitBadge";
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

type PointsField = "pointsTeamA" | "pointsTeamB";
type ZvanjaValue = 20 | 50 | 100 | 150 | 200;

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

  const stepPanelClass =
    "flex flex-col gap-2.5 rounded-[16px] border border-[rgba(255,255,255,0.05)] bg-[rgba(15,50,36,0.5)] p-3";
  const stepBadgeClass =
    "flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-[rgba(201,217,160,0.16)] text-[11px] font-extrabold text-[#c9d9a0]";
  const stepTitleClass =
    "text-[12px] font-bold uppercase tracking-[0.05em] text-[#8fa89b]";
  const teamMiniLabelClass =
    "mb-1 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-[#7d9587]";
  const selectedChipClass =
    "border-[rgba(201,217,160,0.7)] bg-[rgba(201,217,160,0.14)]";
  const offChipClass = "border-[rgba(169,194,179,0.18)] bg-[rgba(6,20,16,0.4)]";

  const activeZvanjaTokens =
    (game.teams.teamA.includes(activeZvanjaPlayerId)
      ? zvanjaTokensByPlayerA[activeZvanjaPlayerId]
      : zvanjaTokensByPlayerB[activeZvanjaPlayerId]) ?? [];

  return (
    <section className="flex flex-col gap-3 rounded-[24px] border border-[rgba(255,255,255,0.05)] bg-[radial-gradient(120%_60%_at_85%_-10%,rgba(201,217,160,0.08)_0%,transparent_55%),linear-gradient(165deg,#0d2a20_0%,#071a14_55%,#061410_100%)] p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[16px] font-extrabold text-[#f7fbf6]">Unos nove ruke</h2>
        {dealerName ? (
          <p className="text-[13px] font-semibold text-[#a9c2b3]">Dijeli: {dealerName}</p>
        ) : null}
      </div>

      {/* KORAK 1 — tko je zvao i koji znak */}
      <div className={stepPanelClass}>
        <div className="flex items-center gap-[7px]">
          <span className={stepBadgeClass}>1</span>
          <p className={stepTitleClass}>Tko je zvao i koji znak</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className={teamMiniLabelClass}>Tim A</p>
            <div className="grid grid-cols-2 gap-1.5">
              {teamAPlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, callerPlayerId: player.id }))}
                  className={`rounded-[9px] border px-[3px] py-2 text-center ${
                    form.callerPlayerId === player.id ? selectedChipClass : offChipClass
                  }`}
                >
                  <p className="text-[12px] font-bold text-[#f7fbf6]">{player.username}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={teamMiniLabelClass}>Tim B</p>
            <div className="grid grid-cols-2 gap-1.5">
              {teamBPlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, callerPlayerId: player.id }))}
                  className={`rounded-[9px] border px-[3px] py-2 text-center ${
                    form.callerPlayerId === player.id ? selectedChipClass : offChipClass
                  }`}
                >
                  <p className="text-[12px] font-bold text-[#f7fbf6]">{player.username}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {calledSuits.map((suit) => (
            <button
              key={suit}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, calledSuit: suit }))}
              className="block"
            >
              <SuitBadge suit={suit} selected={form.calledSuit === suit} chip />
            </button>
          ))}
        </div>
      </div>

      {/* KORAK 2 — bodovi iz čiste igre */}
      <div className={stepPanelClass}>
        <div className="flex items-center gap-[7px]">
          <span className={stepBadgeClass}>2</span>
          <p className={stepTitleClass}>Bodovi iz čiste igre</p>
          <span className="ml-auto text-[11px] font-semibold text-[#7d9587]">zbroj = 162</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActivePointsField("pointsTeamA")}
            className={`rounded-[11px] border px-[10px] py-2 text-left ${
              activePointsField === "pointsTeamA"
                ? "border-[rgba(201,217,160,0.7)] bg-[rgba(201,217,160,0.12)]"
                : "border-[rgba(169,194,179,0.16)] bg-[rgba(6,20,16,0.4)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[#8fa89b]">Tim A</p>
              {activePointsField === "pointsTeamA" ? (
                <span className="text-[9px] font-extrabold tracking-[0.05em] text-[#c9d9a0]">
                  ● UNOS
                </span>
              ) : null}
            </div>
            <p className="mt-px font-mono text-[24px] font-extrabold text-[#f7fbf6]">
              {form.pointsTeamA}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setActivePointsField("pointsTeamB")}
            className={`rounded-[11px] border px-[10px] py-2 text-left ${
              activePointsField === "pointsTeamB"
                ? "border-[rgba(201,217,160,0.7)] bg-[rgba(201,217,160,0.12)]"
                : "border-[rgba(169,194,179,0.16)] bg-[rgba(6,20,16,0.4)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[#8fa89b]">Tim B</p>
              {activePointsField === "pointsTeamB" ? (
                <span className="text-[9px] font-extrabold tracking-[0.05em] text-[#c9d9a0]">
                  ● UNOS
                </span>
              ) : null}
            </div>
            <p className="mt-px font-mono text-[24px] font-extrabold text-[#f7fbf6]">
              {form.pointsTeamB}
            </p>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((digit) => (
            <button
              type="button"
              key={digit}
              onClick={() => appendDigitToPoints(digit)}
              className="rounded-[9px] bg-[rgba(255,255,255,0.05)] py-[9px] text-center font-mono text-[15px] font-bold text-[#eef3ee]"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={backspacePoints}
            className="rounded-[9px] bg-[rgba(201,217,160,0.12)] py-[9px] text-center text-[12px] font-bold text-[#c9d9a0]"
          >
            ⌫ Del
          </button>
          <button
            type="button"
            onClick={clearPoints}
            className="rounded-[9px] bg-[rgba(201,217,160,0.12)] py-[9px] text-center text-[12px] font-bold text-[#c9d9a0]"
          >
            Clear
          </button>
        </div>
      </div>

      {/* KORAK 3 — zvanja */}
      <div className={stepPanelClass}>
        <div className="flex items-center gap-[7px]">
          <span className={stepBadgeClass}>3</span>
          <p className={stepTitleClass}>Zvanja</p>
          <span className="ml-auto text-[11px] text-[#a9c2b3]">
            A <b className="font-mono text-[#eef3ee]">{form.zvanjaTeamA}</b> · B{" "}
            <b className="font-mono text-[#eef3ee]">{form.zvanjaTeamB}</b>
          </span>
        </div>

        <p className="text-[10.5px] text-[#7d9587]">Odaberi igrača, pa dodaj vrijednost:</p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className={teamMiniLabelClass}>Tim A</p>
            <div className="grid grid-cols-2 gap-1.5">
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
                    className={`rounded-[9px] border px-[3px] py-1.5 text-center ${
                      activeZvanjaPlayerId === player.id ? selectedChipClass : offChipClass
                    }`}
                  >
                    <p className="text-[12px] font-bold text-[#f7fbf6]">{player.username}</p>
                    <p
                      className={`mt-px font-mono text-[12px] font-bold ${
                        playerTotal > 0 ? "text-[#c9d9a0]" : "text-[#5f7168]"
                      }`}
                    >
                      {playerTotal}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className={teamMiniLabelClass}>Tim B</p>
            <div className="grid grid-cols-2 gap-1.5">
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
                    className={`rounded-[9px] border px-[3px] py-1.5 text-center ${
                      activeZvanjaPlayerId === player.id ? selectedChipClass : offChipClass
                    }`}
                  >
                    <p className="text-[12px] font-bold text-[#f7fbf6]">{player.username}</p>
                    <p
                      className={`mt-px font-mono text-[12px] font-bold ${
                        playerTotal > 0 ? "text-[#c9d9a0]" : "text-[#5f7168]"
                      }`}
                    >
                      {playerTotal}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {[20, 50, 100, 150, 200].map((value) => {
            const toggle = value === 150 || value === 200;
            const active = toggle && activeZvanjaTokens.includes(value as ZvanjaValue);
            return (
              <button
                type="button"
                key={value}
                onClick={() => applyZvanja(value as ZvanjaValue)}
                className={`rounded-[8px] border py-2 text-center text-[12px] font-extrabold text-[#10261c] ${
                  active
                    ? "border-[rgba(255,255,255,0.55)] bg-[#d7f1c7]"
                    : "border-transparent bg-[rgba(201,217,160,0.85)]"
                }`}
              >
                +{value}
              </button>
            );
          })}
        </div>

        <div className="flex items-stretch gap-1.5">
          <button
            type="button"
            onClick={applyStigliaForActivePointsTeam}
            className={`flex flex-1 items-center justify-between gap-2 rounded-[10px] border px-3 py-2 ${
              form.stigliaTeam
                ? "border-transparent bg-[rgba(201,217,160,0.85)]"
                : "border-[rgba(169,194,179,0.16)] bg-[rgba(6,20,16,0.4)]"
            }`}
          >
            <span
              className={`text-[12px] font-extrabold ${
                form.stigliaTeam ? "text-[#10261c]" : "text-[#dcece3]"
              }`}
            >
              Štiglja +90
            </span>
            <span
              className={`text-[10.5px] font-semibold ${
                form.stigliaTeam ? "text-[rgba(16,38,28,0.75)]" : "text-[#7d9587]"
              }`}
            >
              {form.stigliaTeam ? `Tim ${form.stigliaTeam}` : "Nije upisana"}
            </span>
          </button>
          <button
            type="button"
            onClick={clearZvanjaForActivePlayer}
            className="flex flex-shrink-0 items-center rounded-[10px] bg-[rgba(6,20,16,0.5)] px-3 py-2 text-[11.5px] font-bold text-[#a9c2b3]"
          >
            Reset igrača
          </button>
        </div>
      </div>

      {error ? <p className="text-[14px] font-semibold text-rose-300">{error}</p> : null}

      <div className="grid grid-cols-[1fr_1.6fr] gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[12px] border border-[rgba(169,194,179,0.3)] py-3 text-center text-[13px] font-bold text-[#dcece3]"
          >
            Nazad
          </button>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className={`btn-accent rounded-[12px] py-3 text-center text-[13px] font-extrabold disabled:opacity-60 ${
            onCancel ? "" : "col-span-2"
          }`}
        >
          {loading ? "Spremam..." : submitLabel}
        </button>
      </div>
    </section>
  );
}
