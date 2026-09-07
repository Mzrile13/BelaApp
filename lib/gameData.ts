import { getRepo } from "@/lib/supabase";
import type { Game, Player, Round } from "@/lib/types";

export interface GameBundle {
  game: Game;
  rounds: Round[];
  players: Player[];
}

/**
 * Sve što stranica jedne partije treba, u jednom prolazu i s tri paralelna
 * upita. Prije su ove stranice na serveru dohvaćale partiju samo da provjere
 * vlasništvo, bacile je, poslale praznu ljusku, pa je klijent nakon hydrationa
 * ponovno dohvaćao iste retke kroz `/api/players` i `/api/games/[id]`. Sada
 * server odmah renderira gotov sadržaj.
 */
export async function loadGameBundle(
  accountId: string,
  gameId: string,
): Promise<GameBundle | null> {
  const repo = getRepo(accountId);
  const [game, rounds, players] = await Promise.all([
    repo.getGame(gameId),
    repo.listRounds(gameId),
    repo.listPlayers(),
  ]);
  if (!game) return null;
  return { game, rounds, players };
}
