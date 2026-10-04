import type { Game, RoundInput } from "@/lib/types";
import { isAllowedZvanjaTotal } from "@/lib/validation";

/**
 * Pravila ruke koja zod shema ne može izraziti (zbrojevi, pripadnost igrača
 * partiji). Zajedničko za upis i izmjenu ruke. Vraća poruku greške ili null.
 */
export function validateRoundInput(input: RoundInput, game: Game): string | null {
  // Čista igra uvijek dijeli svih 162 boda; 0 : 0 (npr. nakon "Obriši") nije ruka.
  if (input.pointsTeamA + input.pointsTeamB !== 162) {
    return "Zbroj bodova iz čiste igre mora biti 162";
  }

  if (!isAllowedZvanjaTotal(input.zvanjaTeamA)) {
    return "Zvanja za Tim A moraju biti kombinacija 20, 50, 100, 150 i 200";
  }
  if (!isAllowedZvanjaTotal(input.zvanjaTeamB)) {
    return "Zvanja za Tim B moraju biti kombinacija 20, 50, 100, 150 i 200";
  }

  if (input.stigliaTeam === "A" && input.pointsTeamA !== 162) {
    return "Štiglja za Tim A moguća je samo kad Tim A uzme svih 162 boda iz čiste igre";
  }
  if (input.stigliaTeam === "B" && input.pointsTeamB !== 162) {
    return "Štiglja za Tim B moguća je samo kad Tim B uzme svih 162 boda iz čiste igre";
  }

  const teamA = new Set(game.teams.teamA);
  const teamB = new Set(game.teams.teamB);

  // Inače bi se nepoznat id tiho brojao kao zvanje Tima B (teamForCaller).
  if (!teamA.has(input.callerPlayerId) && !teamB.has(input.callerPlayerId)) {
    return "Zvač mora biti jedan od igrača partije";
  }
  if (input.zvanjaPlayerIdA !== null && !teamA.has(input.zvanjaPlayerIdA)) {
    return "Igrač zvanja za Tim A mora biti iz Tima A";
  }
  if (input.zvanjaPlayerIdB !== null && !teamB.has(input.zvanjaPlayerIdB)) {
    return "Igrač zvanja za Tim B mora biti iz Tima B";
  }

  for (const [team, entries, members, total] of [
    ["A", input.zvanjaByPlayerA ?? [], teamA, input.zvanjaTeamA],
    ["B", input.zvanjaByPlayerB ?? [], teamB, input.zvanjaTeamB],
  ] as const) {
    if (entries.reduce((sum, entry) => sum + entry.points, 0) !== total) {
      return `Zbroj zvanja po igračima za Tim ${team} mora odgovarati ukupnom zvanju tima`;
    }
    for (const entry of entries) {
      if (!members.has(entry.playerId)) {
        return `Svi igrači zvanja za Tim ${team} moraju biti iz Tima ${team}`;
      }
      if (!isAllowedZvanjaTotal(entry.points)) {
        return `Zvanja pojedinog igrača (Tim ${team}) moraju biti kombinacija 20, 50, 100, 150 i 200`;
      }
    }
  }

  return null;
}
