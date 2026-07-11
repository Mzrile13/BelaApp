import { getDealerForRound } from "@/lib/dealer";
import Link from "next/link";
import { SuitBadge, suitLabel } from "@/components/SuitBadge";
import { resolveRoundPoints } from "@/lib/scoring";
import type { CalledSuit, Game, Player, Round } from "@/lib/types";

interface ScoreTimelineProps {
  rounds: Round[];
  game: Game;
  playersById: Map<string, Player>;
  canEditRounds?: boolean;
}

export function ScoreTimeline({ rounds, game, playersById, canEditRounds = false }: ScoreTimelineProps) {
  const allowedSuits: CalledSuit[] = ["karo", "herc", "pik", "tref"];

  const roundsWithTotals: Array<{
    round: Round;
    cumulativeA: number;
    cumulativeB: number;
  }> = [];
  let cumulativeA = 0;
  let cumulativeB = 0;
  for (const round of rounds) {
    const resolvedPoints = resolveRoundPoints(round);
    cumulativeA += resolvedPoints.teamA;
    cumulativeB += resolvedPoints.teamB;
    roundsWithTotals.push({ round, cumulativeA, cumulativeB });
  }

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-xl font-bold text-white">Timeline ruku</h2>
      <div className="relative space-y-3 pl-4">
        {rounds.length === 0 ? (
          <p className="text-sm text-emerald-200">Još nema unesenih ruku.</p>
        ) : (
          <>
            <div className="pointer-events-none absolute bottom-3 left-[7px] top-3 w-px bg-gradient-to-b from-amber-300/60 to-amber-300/5" />
            {roundsWithTotals.map(({ round, cumulativeA, cumulativeB }) => {
            const resolvedPoints = resolveRoundPoints(round);
            const dealerId = getDealerForRound(game, round.roundNumber);
            const dealer = playersById.get(dealerId)?.username ?? "Unknown";
            const callerName = playersById.get(round.callerPlayerId)?.username ?? "Unknown";
            const calledSuit = (round as Partial<Round>).calledSuit;
            const resolvedSuit: CalledSuit =
              typeof calledSuit === "string" &&
              allowedSuits.includes(calledSuit as CalledSuit)
                ? (calledSuit as CalledSuit)
                : "karo";
            const showLegacyMissing = round.calledSuitLegacyMissing === true;
            return (
              <div key={round.id} className="relative">
                <div className="absolute -left-4 top-1.5 h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_0_3px_rgba(4,28,21,1)]" />
                <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/40 px-3 py-3 text-base text-emerald-100">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Ruka #{round.roundNumber}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      A {resolvedPoints.teamA} : {resolvedPoints.teamB} B
                    </span>
                    {canEditRounds ? (
                      <Link
                        href={`/game/${game.id}/edit-round/${round.id}`}
                        className="rounded-md border border-emerald-500 px-2 py-1 text-xs font-semibold text-emerald-100"
                      >
                        Uredi
                      </Link>
                    ) : null}
                  </div>
                </div>
                <p className="text-sm text-emerald-300">
                  Dijeli: {dealer}
                </p>
                <p className="text-sm text-emerald-300">
                  Ukupno: A {cumulativeA} : {cumulativeB} B
                </p>
                <div className="mt-1 flex items-center gap-2 text-sm text-emerald-300">
                  <span>Zvano:</span>
                  {showLegacyMissing ? (
                    <span className="text-amber-200">nije upisano (stara ruka)</span>
                  ) : (
                    <>
                      <SuitBadge suit={resolvedSuit} compact />
                      <span>{suitLabel(resolvedSuit)}</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-emerald-300">
                  Zvanja: A {round.zvanjaTeamA} / B {round.zvanjaTeamB} ·{" "}
                  <span className="font-semibold text-emerald-50">{callerName}</span>{" "}
                  {round.callerSucceeded ? "uspješan" : "neuspješan"}
                </p>
                {round.stigliaTeam ? (
                  <p className="text-sm text-emerald-300">Štiglja: Tim {round.stigliaTeam} (+90)</p>
                ) : null}
                {(() => {
                  const entriesA = (round.zvanjaByPlayerA ?? [])
                    .filter((entry) => entry.points > 0)
                    .map(
                      (entry) =>
                        `${playersById.get(entry.playerId)?.username ?? "Unknown"} (${entry.points})`,
                    );
                  const entriesB = (round.zvanjaByPlayerB ?? [])
                    .filter((entry) => entry.points > 0)
                    .map(
                      (entry) =>
                        `${playersById.get(entry.playerId)?.username ?? "Unknown"} (${entry.points})`,
                    );
                  const hasArrayData = entriesA.length > 0 || entriesB.length > 0;

                  if (hasArrayData) {
                    return (
                      <p className="text-sm text-emerald-300">
                        Zvanja igrači: A {entriesA.join(", ") || "-"} / B{" "}
                        {entriesB.join(", ") || "-"}
                      </p>
                    );
                  }

                  if (round.zvanjaPlayerIdA || round.zvanjaPlayerIdB) {
                    return (
                      <p className="text-sm text-emerald-300">
                        Zvanja igrači: A{" "}
                        {round.zvanjaPlayerIdA
                          ? `${playersById.get(round.zvanjaPlayerIdA)?.username ?? "Unknown"} (${round.zvanjaTeamA})`
                          : "-"}{" "}
                        / B{" "}
                        {round.zvanjaPlayerIdB
                          ? `${playersById.get(round.zvanjaPlayerIdB)?.username ?? "Unknown"} (${round.zvanjaTeamB})`
                          : "-"}
                      </p>
                    );
                  }

                  return null;
                })()}
                {!round.callerSucceeded ? (
                  <span className="mt-2 inline-flex rounded-full bg-rose-600/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    PAD
                  </span>
                ) : null}
                </div>
              </div>
            );
            })}
          </>
        )}
      </div>
    </section>
  );
}
