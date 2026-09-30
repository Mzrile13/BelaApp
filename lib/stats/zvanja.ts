import type { CalledSuit, Round } from "@/lib/types";

export function topSuit(counter: Record<CalledSuit, number>): CalledSuit | null {
  const best = (Object.entries(counter) as Array<[CalledSuit, number]>).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : null;
}

export function emptySuitCounter(): Record<CalledSuit, number> {
  return { karo: 0, herc: 0, pik: 0, tref: 0 };
}

/** Zvanja koja je proglasio konkretno ovaj igrač (s fallbackom na stari, timski zapis). */
export function zvanjaForPlayer(roundRow: Round, playerId: string) {
  const byPlayerA = roundRow.zvanjaByPlayerA ?? [];
  const byPlayerB = roundRow.zvanjaByPlayerB ?? [];
  if (byPlayerA.length || byPlayerB.length) {
    return [...byPlayerA, ...byPlayerB]
      .filter((entry) => entry.playerId === playerId)
      .reduce((sum, entry) => sum + entry.points, 0);
  }
  return (
    (roundRow.zvanjaPlayerIdA === playerId ? roundRow.zvanjaTeamA : 0) +
    (roundRow.zvanjaPlayerIdB === playerId ? roundRow.zvanjaTeamB : 0)
  );
}
