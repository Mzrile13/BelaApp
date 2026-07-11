import { unstable_noStore as noStore } from "next/cache";
import { ActiveGamesList } from "@/components/ActiveGamesList";
import { BackButton } from "@/components/BackButton";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { getRepo } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ActiveGamesPage() {
  noStore();
  const repo = getRepo();
  const players = await repo.listPlayers();
  const games = await repo.listGames();
  const rounds = await repo.listRoundsForGames(games.map((game) => game.id));
  const roundsByGameId = new Map<string, typeof rounds>();
  for (const round of rounds) {
    const bucket = roundsByGameId.get(round.gameId) ?? [];
    bucket.push(round);
    roundsByGameId.set(round.gameId, bucket);
  }
  const playersById = new Map(players.map((player) => [player.id, player.username]));

  const activeGames = games
    .map((game) => {
      const gameRounds = roundsByGameId.get(game.id) ?? [];
      const score = getGameScore(gameRounds);
      const winner = getWinningTeam(score);
      return { game, rounds: gameRounds, score, winner };
    })
    .filter(({ game, winner }) => game.finishedAt === null && winner === null);

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/" className="mb-3" />

      <section className="card p-4">
        <h1 className="text-xl font-bold text-[#f7fbf6]">Aktivne partije</h1>
        <p className="text-sm text-[#a9c2b3]">
          Odaberi partiju koju želiš nastaviti.
        </p>
      </section>

      <ActiveGamesList
        initialGames={activeGames.map(({ game, score, rounds }) => ({
          id: game.id,
          createdAt: game.createdAt,
          teamA: game.teams.teamA.map((id) => playersById.get(id) ?? "Unknown").join(" + "),
          teamB: game.teams.teamB.map((id) => playersById.get(id) ?? "Unknown").join(" + "),
          score,
          roundsCount: rounds.length,
        }))}
      />
    </main>
  );
}
