import type { ScoredGame } from "@/lib/rating";

export interface HeadToHeadResult {
  /** A i B u suprotnim timovima; sve iz perspektive igrača A. */
  opponents: {
    games: number;
    winsA: number;
    winsB: number;
    /** Prosječna razlika rezultata (tim A-igrača minus tim B-igrača). */
    avgMargin: number;
    last5: Array<"W" | "L">;
  };
  /** A i B u istom timu. */
  partners: {
    games: number;
    wins: number;
    winRate: number;
  };
}

export function computeHeadToHead(
  playerAId: string,
  playerBId: string,
  scoredGames: ScoredGame[],
): HeadToHeadResult {
  let opponentGames = 0;
  let winsA = 0;
  let winsB = 0;
  let marginSum = 0;
  const results: Array<"W" | "L"> = [];
  let partnerGames = 0;
  let partnerWins = 0;

  for (const scored of scoredGames) {
    const { teamA, teamB } = scored.game.teams;
    const teamOfA = teamA.includes(playerAId) ? "A" : teamB.includes(playerAId) ? "B" : null;
    const teamOfB = teamA.includes(playerBId) ? "A" : teamB.includes(playerBId) ? "B" : null;
    if (!teamOfA || !teamOfB) continue;

    if (teamOfA === teamOfB) {
      partnerGames += 1;
      if (scored.winner === teamOfA) partnerWins += 1;
      continue;
    }

    opponentGames += 1;
    marginSum += teamOfA === "A" ? scored.scoreA - scored.scoreB : scored.scoreB - scored.scoreA;
    if (scored.winner === teamOfA) {
      winsA += 1;
      results.push("W");
    } else if (scored.winner === teamOfB) {
      winsB += 1;
      results.push("L");
    }
  }

  return {
    opponents: {
      games: opponentGames,
      winsA,
      winsB,
      avgMargin: opponentGames ? marginSum / opponentGames : 0,
      last5: results.slice(-5),
    },
    partners: {
      games: partnerGames,
      wins: partnerWins,
      winRate: partnerGames ? partnerWins / partnerGames : 0,
    },
  };
}
