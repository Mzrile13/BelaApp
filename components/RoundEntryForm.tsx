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

  const sectionLabelClass =
    "mb-[5px] text-[10.5px] font-bold uppercase tracking-[0.04em] text-[#8fa89b]";
  const teamPanelClass =
    "rounded-[10px] border border-[rgba(169,194,179,0.14)] bg-[rgba(6,20,16,0.22)] p-1.5";
  const teamPanelLabelClass =
    "mb-1 text-center text-[9px] font-bold uppercase tracking-[0.03em] text-[#8fa89b]";

  return (
    <section className="rounded-[16px] border border-[rgba(255,255,255,0.05)] bg-[rgba(15,50,36,0.5)] p-3">
      <h2 className="mb-2 text-[13.5px] font-bold text-[#f2f5f0]">Unos nove ruke</h2>
      {dealerName ? (
        <p className="mb-2 text-[13px] font-semibold text-[#a9c2b3]">Dijeli: {dealerName}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <p className={sectionLabelClass}>Tko je zvao</p>
          <div className="grid grid-cols-2 gap-1.5">
            <div className={teamPanelClass}>
              <p className={teamPanelLabelClass}>Tim A</p>
              <div className="grid grid-cols-2 gap-1">
                {teamAPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, callerPlayerId: player.id }))}
                    className={`rounded-[8px] border px-[3px] py-[7px] text-center ${
                      form.callerPlayerId === player.id
                        ? "border-[rgba(201,217,160,0.7)] bg-[rgba(201,217,160,0.14)]"
                        : "border-[rgba(169,194,179,0.18)] bg-[rgba(6,20,16,0.4)]"
                    }`}
                  >
                    <p className="text-[10.5px] font-bold text-[#f7fbf6]">{player.username}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className={teamPanelClass}>
              <p className={teamPanelLabelClass}>Tim B</p>
              <div className="grid grid-cols-2 gap-1">
                {teamBPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, callerPlayerId: player.id }))}
                    className={`rounded-[8px] border px-[3px] py-[7px] text-center ${
                      form.callerPlayerId === player.id
                        ? "border-[rgba(201,217,160,0.7)] bg-[rgba(201,217,160,0.14)]"
                        : "border-[rgba(169,194,179,0.18)] bg-[rgba(6,20,16,0.4)]"
                    }`}
                  >
                    <p className="text-[10.5px] font-bold text-[#f7fbf6]">{player.username}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <p className={sectionLabelClass}>Zvani znak</p>
          <div className="grid grid-cols-4 gap-[5px]">
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

        <button
          type="button"
          onClick={() => setActivePointsField("pointsTeamA")}
          className={`rounded-[11px] border px-[9px] py-2 text-left ${
            activePointsField === "pointsTeamA"
              ? "border-[rgba(201,217,160,0.7)] bg-[rgba(201,217,160,0.12)]"
              : "border-[rgba(169,194,179,0.16)] bg-[rgba(6,20,16,0.4)]"
          }`}
        >
          <p className="text-[10px] font-semibold text-[#8fa89b]">Bodovi Tim A</p>
          <p className="mt-px font-mono text-[22px] font-extrabold text-[#f7fbf6]">
            {form.pointsTeamA}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setActivePointsField("pointsTeamB")}
          className={`rounded-[11px] border px-[9px] py-2 text-left ${
            activePointsField === "pointsTeamB"
              ? "border-[rgba(201,217,160,0.7)] bg-[rgba(201,217,160,0.12)]"
              : "border-[rgba(169,194,179,0.16)] bg-[rgba(6,20,16,0.4)]"
          }`}
        >
          <p className="text-[10px] font-semibold text-[#8fa89b]">Bodovi Tim B</p>
          <p className="mt-px font-mono text-[22px] font-extrabold text-[#f7fbf6]">
            {form.pointsTeamB}
          </p>
        </button>

        <div className="col-span-2 rounded-[13px] bg-[rgba(6,20,16,0.4)] p-2">
          <div className="space-y-1.5">
            {keypadRows.slice(0, 3).map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="grid grid-cols-3 gap-1.5">
                {row.map((digit) => (
                  <button
                    type="button"
                    key={digit}
                    onClick={() => appendDigitToPoints(digit)}
                    className="rounded-[8px] bg-[rgba(255,255,255,0.05)] py-2 text-center font-mono text-[14px] font-bold text-[#eef3ee]"
                  >
                    {digit}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => appendDigitToPoints("0")}
              className="rounded-[8px] bg-[rgba(255,255,255,0.05)] py-2 text-center font-mono text-[14px] font-bold text-[#eef3ee]"
            >
              0
            </button>
            <button
              type="button"
              onClick={backspacePoints}
              className="rounded-[8px] bg-[rgba(201,217,160,0.12)] py-2 text-center text-[11.5px] font-bold text-[#c9d9a0]"
            >
              Del
            </button>
            <button
              type="button"
              onClick={clearPoints}
              className="rounded-[8px] bg-[rgba(201,217,160,0.12)] py-2 text-center text-[11.5px] font-bold text-[#c9d9a0]"
            >
              Clear
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveZvanjaPlayerId(teamAPlayers[0]?.id ?? "")}
          className={`rounded-[11px] border px-[9px] py-2 text-left ${
            game.teams.teamA.includes(activeZvanjaPlayerId)
              ? "border-[rgba(201,217,160,0.7)] bg-[rgba(201,217,160,0.12)]"
              : "border-[rgba(169,194,179,0.16)] bg-[rgba(6,20,16,0.4)]"
          }`}
        >
          <p className="text-[10px] font-semibold text-[#8fa89b]">Zvanja Tim A</p>
          <p className="mt-px font-mono text-[18px] font-extrabold text-[#f7fbf6]">
            {form.zvanjaTeamA}
          </p>
          <p className="mt-0.5 text-[10px] text-[#8fa89b]">
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
          className={`rounded-[11px] border px-[9px] py-2 text-left ${
            game.teams.teamB.includes(activeZvanjaPlayerId)
              ? "border-[rgba(201,217,160,0.7)] bg-[rgba(201,217,160,0.12)]"
              : "border-[rgba(169,194,179,0.16)] bg-[rgba(6,20,16,0.4)]"
          }`}
        >
          <p className="text-[10px] font-semibold text-[#8fa89b]">Zvanja Tim B</p>
          <p className="mt-px font-mono text-[18px] font-extrabold text-[#f7fbf6]">
            {form.zvanjaTeamB}
          </p>
          <p className="mt-0.5 text-[10px] text-[#8fa89b]">
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

        <div className="col-span-2 rounded-[13px] bg-[rgba(6,20,16,0.4)] p-2">
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.04em] text-[#8fa89b]">
            Odaberi igrača kojem upisuješ zvanje
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            <div className={teamPanelClass}>
              <p className={teamPanelLabelClass}>Tim A</p>
              <div className="grid grid-cols-2 gap-1">
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
                      className={`rounded-[8px] border px-[3px] py-[7px] text-center ${
                        activeZvanjaPlayerId === player.id
                          ? "border-[rgba(201,217,160,0.7)] bg-[rgba(201,217,160,0.14)]"
                          : "border-[rgba(169,194,179,0.18)] bg-[rgba(6,20,16,0.4)]"
                      }`}
                    >
                      <p className="text-[10.5px] font-bold text-[#f7fbf6]">{player.username}</p>
                      <p className="text-[9px] text-[#8fa89b]">Zvanje: {playerTotal}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={teamPanelClass}>
              <p className={teamPanelLabelClass}>Tim B</p>
              <div className="grid grid-cols-2 gap-1">
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
                      className={`rounded-[8px] border px-[3px] py-[7px] text-center ${
                        activeZvanjaPlayerId === player.id
                          ? "border-[rgba(201,217,160,0.7)] bg-[rgba(201,217,160,0.14)]"
                          : "border-[rgba(169,194,179,0.18)] bg-[rgba(6,20,16,0.4)]"
                      }`}
                    >
                      <p className="text-[10.5px] font-bold text-[#f7fbf6]">{player.username}</p>
                      <p className="text-[9px] text-[#8fa89b]">Zvanje: {playerTotal}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <p className={sectionLabelClass}>Zvanja</p>
          <div className="grid grid-cols-5 gap-[5px]">
            {[20, 50, 100, 150, 200].map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => applyZvanja(value as ZvanjaValue)}
                className="rounded-[8px] bg-[rgba(201,217,160,0.85)] py-[7px] text-center text-[11px] font-bold text-[#10261c]"
              >
                +{value}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 rounded-[10px] bg-[rgba(6,20,16,0.4)] px-2.5 py-2">
            <button
              type="button"
              onClick={applyStigliaForActivePointsTeam}
              className={`shrink-0 rounded-[7px] px-[9px] py-[5px] text-[10.5px] font-bold whitespace-nowrap ${
                form.stigliaTeam
                  ? "bg-[rgba(201,217,160,0.85)] text-[#10261c]"
                  : "bg-[rgba(6,20,16,0.5)] text-[#a9c2b3]"
              }`}
            >
              Štiglja +90
            </button>
            <p className="min-w-0 flex-1 text-right text-[11px] text-[#a9c2b3]">
              {form.stigliaTeam ? `Upisana: Tim ${form.stigliaTeam}` : "Nije upisana"}
            </p>
          </div>
          <button
            type="button"
            onClick={clearZvanjaForActivePlayer}
            className="mt-1.5 w-full rounded-[8px] bg-[rgba(201,217,160,0.12)] py-2 text-center text-[11.5px] font-bold text-[#c9d9a0]"
          >
            Reset aktivnog igrača
          </button>
        </div>
      </div>

      {error ? <p className="mt-2 text-[13px] font-semibold text-rose-300">{error}</p> : null}

      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[11px] border border-[rgba(169,194,179,0.3)] py-[11px] text-center text-[12.5px] font-bold text-[#dcece3]"
          >
            Nazad
          </button>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className={`btn-accent rounded-[11px] py-[11px] text-center text-[12.5px] font-bold disabled:opacity-60 ${
            onCancel ? "" : "col-span-2"
          }`}
        >
          {loading ? "Spremam..." : submitLabel}
        </button>
      </div>
    </section>
  );
}
