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

  // Bodovi ruke i tekući zbroj se izračunaju u jednom prolazu i odmah se slože
  // obrnutim redoslijedom (najnovija ruka gore). Prije se `resolveRoundPoints`
  // zvao dvaput po ruci, a lista se kopirala samo da bi se okrenula.
  const roundsWithTotals: Array<{
    round: Round;
    points: { teamA: number; teamB: number };
    cumulativeA: number;
    cumulativeB: number;
  }> = [];
  let cumulativeA = 0;
  let cumulativeB = 0;
  for (const round of rounds) {
    const points = resolveRoundPoints(round);
    cumulativeA += points.teamA;
    cumulativeB += points.teamB;
    roundsWithTotals.unshift({ round, points, cumulativeA, cumulativeB });
  }

  return (
    <section>
      <h2 className="mb-3.5 text-[20px] font-extrabold text-heading">Timeline ruku</h2>
      <div className="relative rounded-[20px] border border-white/5 bg-panel/50 pt-2 pr-3.5 pb-3.5 pl-[22px]">
        {rounds.length === 0 ? (
          <p className="text-sm text-muted">Još nema unesenih ruku.</p>
        ) : (
          <>
            <div className="pointer-events-none absolute top-5 bottom-5 left-[26px] w-[1.5px] bg-gradient-to-b from-accent/50 to-accent/5" />
            <div className="mt-2.5 flex flex-col gap-3.5">
              {roundsWithTotals.map(({ round, points: resolvedPoints, cumulativeA, cumulativeB }) => {
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
                  <div key={round.id} className="relative pl-[22px]">
                    <div className="absolute top-1.5 -left-2 h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_0_3px_#0a2019]" />
                    <div className="rounded-[14px] bg-well/45 px-3.5 py-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[13px] font-bold text-heading">
                          Ruka #{round.roundNumber}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[13px] font-bold text-ink">
                            A {resolvedPoints.teamA} : {resolvedPoints.teamB} B
                          </span>
                          {canEditRounds ? (
                            <Link
                              href={`/game/${game.id}/edit-round/${round.id}`}
                              className="rounded-md border border-subtle/30 px-2 py-1 text-xs font-semibold text-soft"
                            >
                              Uredi
                            </Link>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-[11.5px] text-muted">Dijeli: {dealer}</p>
                      <p className="text-[11.5px] text-muted">
                        Ukupno: A {cumulativeA} : {cumulativeB} B
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11.5px] text-muted">
                        <span>Zvano:</span>
                        {showLegacyMissing ? (
                          <span className="text-accent">nije upisano (stara ruka)</span>
                        ) : (
                          <>
                            <SuitBadge suit={resolvedSuit} bare />
                            <span>{suitLabel(resolvedSuit)}</span>
                          </>
                        )}
                      </div>
                      <p className="text-[11.5px] text-muted">
                        Zvanja: A {round.zvanjaTeamA} / B {round.zvanjaTeamB} ·{" "}
                        <span className="font-bold text-heading">{callerName}</span>{" "}
                        {round.callerSucceeded ? "uspješan" : "neuspješan"}
                      </p>
                      {round.stigliaTeam ? (
                        <p className="text-[11.5px] text-muted">
                          Štiglja: Tim {round.stigliaTeam} (+90)
                        </p>
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
                            <p className="text-[11.5px] text-muted">
                              Zvanja igrači: A {entriesA.join(", ") || "-"} / B{" "}
                              {entriesB.join(", ") || "-"}
                            </p>
                          );
                        }

                        if (round.zvanjaPlayerIdA || round.zvanjaPlayerIdB) {
                          return (
                            <p className="text-[11.5px] text-muted">
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
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-[3px] text-[11.5px] font-bold tracking-[0.03em] uppercase ${
                            round.callerSucceeded
                              ? "bg-accent/85 text-on-accent"
                              : "bg-pad/85 text-white"
                          }`}
                        >
                          {round.callerSucceeded ? "Prošao" : "Pao"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
