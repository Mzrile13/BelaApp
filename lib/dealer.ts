import type { Game } from "@/lib/types";

function uniqueOrder(ids: string[]) {
  return Array.from(new Set(ids.filter((id) => id.length > 0)));
}

export function getDealerRotation(game: Game): string[] {
  const tableOrder = uniqueOrder([
    game.teams.teamA[0],
    game.teams.teamB[0],
    game.teams.teamA[1],
    game.teams.teamB[1],
  ]);

  if (tableOrder.includes(game.dealerPlayerId)) {
    return tableOrder;
  }

  return uniqueOrder([game.dealerPlayerId, ...tableOrder]);
}

export function getDealerForRound(game: Game, roundNumber: number): string {
  const rotation = getDealerRotation(game);
  if (!rotation.length) return game.dealerPlayerId;
  const firstDealerIndex = Math.max(0, rotation.indexOf(game.dealerPlayerId));
  const offset = Math.max(0, roundNumber - 1);
  return rotation[(firstDealerIndex + offset) % rotation.length];
}

export function getNextDealer(game: Game, roundsPlayed: number): string {
  return getDealerForRound(game, roundsPlayed + 1);
}
