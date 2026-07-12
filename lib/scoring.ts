import type { Game, Round, RoundInput, TeamId } from "@/lib/types";
export const GAME_TARGET_SCORE = 1001;

export interface ComputedRound extends Omit<RoundInput, "pointsTeamA" | "pointsTeamB"> {
  pointsTeamA: number;
  pointsTeamB: number;
  callingTeam: TeamId;
  callerSucceeded: boolean;
}

export function teamForCaller(game: Game, callerPlayerId: string): TeamId {
  return game.teams.teamA.includes(callerPlayerId) ? "A" : "B";
}

export function evaluateCallerSuccess(
  callingTeam: TeamId,
  totalPointsTeamA: number,
  totalPointsTeamB: number,
): boolean {
  const total = totalPointsTeamA + totalPointsTeamB;
  if (total <= 0) return false;
  const callerPoints = callingTeam === "A" ? totalPointsTeamA : totalPointsTeamB;
  return callerPoints > total / 2;
}

export function computeRound(game: Game, input: RoundInput): ComputedRound {
  const callingTeam = teamForCaller(game, input.callerPlayerId);
  const cleanTotal = input.pointsTeamA + input.pointsTeamB;
  let effectiveZvanjaA = input.zvanjaTeamA;
  let effectiveZvanjaB = input.zvanjaTeamB;
  if (input.stigliaTeam === "A") {
    effectiveZvanjaA = input.zvanjaTeamA + input.zvanjaTeamB;
    effectiveZvanjaB = 0;
  }
  if (input.stigliaTeam === "B") {
    effectiveZvanjaA = 0;
    effectiveZvanjaB = input.zvanjaTeamA + input.zvanjaTeamB;
  }
  const zvanjaTotal = effectiveZvanjaA + effectiveZvanjaB;
  const stigliaBonusA = input.stigliaTeam === "A" ? 90 : 0;
  const stigliaBonusB = input.stigliaTeam === "B" ? 90 : 0;
  const stigliaBonusTotal = stigliaBonusA + stigliaBonusB;
  const displayTotalA = input.pointsTeamA + effectiveZvanjaA + stigliaBonusA;
  const displayTotalB = input.pointsTeamB + effectiveZvanjaB + stigliaBonusB;
  const callerSucceeded = evaluateCallerSuccess(
    callingTeam,
    displayTotalA,
    displayTotalB,
  );

  let pointsTeamA = displayTotalA;
  let pointsTeamB = displayTotalB;

  if (!callerSucceeded && callingTeam === "A") {
    pointsTeamA = 0;
    pointsTeamB = cleanTotal + zvanjaTotal + stigliaBonusTotal;
  }

  if (!callerSucceeded && callingTeam === "B") {
    pointsTeamA = cleanTotal + zvanjaTotal + stigliaBonusTotal;
    pointsTeamB = 0;
  }

  const zvanjaByPlayerA = input.zvanjaByPlayerA ?? [];
  const zvanjaByPlayerB = input.zvanjaByPlayerB ?? [];
  const firstZvanjaA =
    zvanjaByPlayerA.find((entry) => entry.points > 0)?.playerId ?? input.zvanjaPlayerIdA;
  const firstZvanjaB =
    zvanjaByPlayerB.find((entry) => entry.points > 0)?.playerId ?? input.zvanjaPlayerIdB;

  return {
    gameId: input.gameId,
    callerPlayerId: input.callerPlayerId,
    calledSuit: input.calledSuit,
    callingTeam,
    pointsTeamA,
    pointsTeamB,
    zvanjaTeamA: input.zvanjaTeamA,
    zvanjaTeamB: input.zvanjaTeamB,
    zvanjaPlayerIdA: firstZvanjaA,
    zvanjaPlayerIdB: firstZvanjaB,
    zvanjaByPlayerA,
    zvanjaByPlayerB,
    stigliaTeam: input.stigliaTeam,
    callerSucceeded,
  };
}

/**
 * Inverse of {@link computeRound}. A stored round keeps the *computed* display
 * points in `pointsTeamA`/`pointsTeamB` (clean points + zvanja + štiglja bonus,
 * or everything shifted to one team when the caller fell). The round entry form
 * however works with the raw *clean* points (which always sum to ≤ 162). When
 * pre-filling the edit form we must reconstruct those clean points, otherwise
 * the zvanja get shown inside the clean-points fields and the total wrongly
 * exceeds 162, blocking the save.
 */
export function deriveInputPoints(round: Round): { pointsTeamA: number; pointsTeamB: number } {
  const clamp = (value: number) => Math.max(0, Math.min(162, value));
  const stigliaTeam = round.stigliaTeam;
  const zvanjaTotal = round.zvanjaTeamA + round.zvanjaTeamB;

  let effectiveZvanjaA = round.zvanjaTeamA;
  let effectiveZvanjaB = round.zvanjaTeamB;
  if (stigliaTeam === "A") {
    effectiveZvanjaA = zvanjaTotal;
    effectiveZvanjaB = 0;
  }
  if (stigliaTeam === "B") {
    effectiveZvanjaA = 0;
    effectiveZvanjaB = zvanjaTotal;
  }
  const stigliaBonusA = stigliaTeam === "A" ? 90 : 0;
  const stigliaBonusB = stigliaTeam === "B" ? 90 : 0;

  if (round.callerSucceeded) {
    return {
      pointsTeamA: clamp(round.pointsTeamA - effectiveZvanjaA - stigliaBonusA),
      pointsTeamB: clamp(round.pointsTeamB - effectiveZvanjaB - stigliaBonusB),
    };
  }

  // Caller fell: all points were shifted to the non-calling team, so the
  // original clean split is not recoverable. Put the recovered clean total on
  // the team that actually took the tricks (the non-calling one). Re-running
  // computeRound on this reproduces the same fallen-caller round.
  const winnerStored = round.callingTeam === "A" ? round.pointsTeamB : round.pointsTeamA;
  const cleanTotal = clamp(winnerStored - zvanjaTotal - (stigliaBonusA + stigliaBonusB));
  return round.callingTeam === "A"
    ? { pointsTeamA: 0, pointsTeamB: cleanTotal }
    : { pointsTeamA: cleanTotal, pointsTeamB: 0 };
}

export function resolveRoundPoints(round: Round) {
  const stigliaTeam = round.stigliaTeam;
  if (!stigliaTeam) {
    return { teamA: round.pointsTeamA, teamB: round.pointsTeamB };
  }

  const baseTotal = 162 + round.zvanjaTeamA + round.zvanjaTeamB;
  const currentTotal = round.pointsTeamA + round.pointsTeamB;
  const stigliaAlreadyIncluded = currentTotal >= baseTotal + 90;
  if (stigliaAlreadyIncluded) {
    return { teamA: round.pointsTeamA, teamB: round.pointsTeamB };
  }

  if (stigliaTeam === "A") {
    return { teamA: round.pointsTeamA + 90, teamB: round.pointsTeamB };
  }
  return { teamA: round.pointsTeamA, teamB: round.pointsTeamB + 90 };
}

export function getGameScore(rounds: Round[]) {
  return rounds.reduce(
    (acc, round) => {
      const resolved = resolveRoundPoints(round);
      acc.teamA += resolved.teamA;
      acc.teamB += resolved.teamB;
      return acc;
    },
    { teamA: 0, teamB: 0 },
  );
}

export function getWinningTeam(
  score: { teamA: number; teamB: number },
  targetScore = GAME_TARGET_SCORE,
): TeamId | null {
  const reachedA = score.teamA >= targetScore;
  const reachedB = score.teamB >= targetScore;
  if (!reachedA && !reachedB) return null;
  if (reachedA && reachedB) {
    if (score.teamA === score.teamB) return null;
    return score.teamA > score.teamB ? "A" : "B";
  }
  return reachedA ? "A" : "B";
}
