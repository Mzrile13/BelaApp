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
    <section>
      <h2 className="mb-3.5 text-[20px] font-extrabold text-[#f7fbf6]">Timeline ruku</h2>
      <div className="relative rounded-[20px] border border-[rgba(255,255,255,0.05)] bg-[rgba(15,50,36,0.5)] pt-2 pr-3.5 pb-3.5 pl-[22px]">
        {rounds.length === 0 ? (
          <p className="text-sm text-[#8fa89b]">Još nema unesenih ruku.</p>
        ) : (
          <>
            <div className="pointer-events-none absolute top-5 bottom-5 left-[26px] w-[1.5px] bg-gradient-to-b from-[rgba(201,217,160,0.5)] to-[rgba(201,217,160,0.05)]" />
            <div className="mt-2.5 flex flex-col gap-3.5">
              {[...roundsWithTotals].reverse().map(({ round, cumulativeA, cumulativeB }) => {
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
                  <div key={round.id} className="relative pl-[22px]">
                    <div className="absolute top-1.5 -left-2 h-2.5 w-2.5 rounded-full bg-[#c9d9a0] shadow-[0_0_0_3px_#0a2019]" />
                    <div className="rounded-[14px] bg-[rgba(6,20,16,0.45)] px-3.5 py-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[13px] font-bold text-[#f2f5f0]">
                          Ruka #{round.roundNumber}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[13px] font-bold text-[#eef3ee]">
                            A {resolvedPoints.teamA} : {resolvedPoints.teamB} B
                          </span>
                          {canEditRounds ? (
                            <Link
                              href={`/game/${game.id}/edit-round/${round.id}`}
                              className="rounded-md border border-[rgba(169,194,179,0.3)] px-2 py-1 text-xs font-semibold text-[#dcece3]"
                            >
                              Uredi
                            </Link>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-[11.5px] text-[#8fa89b]">Dijeli: {dealer}</p>
                      <p className="text-[11.5px] text-[#8fa89b]">
                        Ukupno: A {cumulativeA} : {cumulativeB} B
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11.5px] text-[#8fa89b]">
                        <span>Zvano:</span>
                        {showLegacyMissing ? (
                          <span className="text-[#c9d9a0]">nije upisano (stara ruka)</span>
                        ) : (
                          <>
                            <SuitBadge suit={resolvedSuit} bare />
                            <span>{suitLabel(resolvedSuit)}</span>
                          </>
                        )}
                      </div>
                      <p className="text-[11.5px] text-[#8fa89b]">
                        Zvanja: A {round.zvanjaTeamA} / B {round.zvanjaTeamB} ·{" "}
                        <span className="font-bold text-[#f2f5f0]">{callerName}</span>{" "}
                        {round.callerSucceeded ? "uspješan" : "neuspješan"}
                      </p>
                      {round.stigliaTeam ? (
                        <p className="text-[11.5px] text-[#8fa89b]">
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
                            <p className="text-[11.5px] text-[#8fa89b]">
                              Zvanja igrači: A {entriesA.join(", ") || "-"} / B{" "}
                              {entriesB.join(", ") || "-"}
                            </p>
                          );
                        }

                        if (round.zvanjaPlayerIdA || round.zvanjaPlayerIdB) {
                          return (
                            <p className="text-[11.5px] text-[#8fa89b]">
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
                          className={`rounded-full px-2 py-[3px] text-[10.5px] font-bold tracking-[0.03em] uppercase ${
                            round.callerSucceeded
                              ? "bg-[rgba(201,217,160,0.85)] text-[#10261c]"
                              : "bg-[rgba(196,90,74,0.85)] text-white"
                          }`}
                        >
                          {round.callerSucceeded ? "Prošao" : "Pad"}
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
