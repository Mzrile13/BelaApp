import { getDealerForRound } from "@/lib/dealer";
import { SuitBadge, suitLabel } from "@/components/SuitBadge";
import { resolveRoundPoints } from "@/lib/scoring";
import type { CalledSuit, Game, Player, Round } from "@/lib/types";

interface ScoreTimelineProps {
  rounds: Round[];
  game: Game;
  playersById: Map<string, Player>;
}

export function ScoreTimeline({ rounds, game, playersById }: ScoreTimelineProps) {
  let cumulativeA = 0;
  let cumulativeB = 0;
  const allowedSuits: CalledSuit[] = ["karo", "herc", "pik", "tref"];

  return (
    <section className="rounded-2xl border border-emerald-700/40 bg-emerald-900/50 p-4 shadow-xl shadow-emerald-950/30">
      <h2 className="mb-3 text-xl font-bold text-white">Timeline ruku</h2>
      <div className="space-y-2">
        {rounds.length === 0 ? (
          <p className="text-sm text-emerald-200">Još nema unesenih ruku.</p>
        ) : (
          rounds.map((round) => {
            const resolvedPoints = resolveRoundPoints(round);
            cumulativeA += resolvedPoints.teamA;
            cumulativeB += resolvedPoints.teamB;
            const dealerId = getDealerForRound(game, round.roundNumber);
            const dealer = playersById.get(dealerId)?.username ?? "Unknown";
            const calledSuit = (round as Partial<Round>).calledSuit;
            const resolvedSuit: CalledSuit =
              typeof calledSuit === "string" &&
              allowedSuits.includes(calledSuit as CalledSuit)
                ? (calledSuit as CalledSuit)
                : "karo";
            const showLegacyMissing = round.calledSuitLegacyMissing === true;
            return (
              <div
                key={round.id}
                className="rounded-xl border border-emerald-700/40 bg-emerald-950/40 px-3 py-3 text-base text-emerald-100"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Ruka #{round.roundNumber}</span>
                  <span className="font-semibold">
                    A {resolvedPoints.teamA} : {resolvedPoints.teamB} B
                  </span>
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
                  Zvanja: A {round.zvanjaTeamA} / B {round.zvanjaTeamB} · Caller{" "}
                  {round.callerSucceeded ? "uspješan" : "pao"}
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
                        Zvanja igrač: A{" "}
                        {round.zvanjaPlayerIdA
                          ? (playersById.get(round.zvanjaPlayerIdA)?.username ?? "Unknown")
                          : "-"}{" "}
                        / B{" "}
                        {round.zvanjaPlayerIdB
                          ? (playersById.get(round.zvanjaPlayerIdB)?.username ?? "Unknown")
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
            );
          })
        )}
      </div>
    </section>
  );
}
