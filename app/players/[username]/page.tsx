import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { PlayerStatsCard } from "@/components/PlayerStatsCard";
import { getRepo } from "@/lib/supabase";
import { computePlayerStats } from "@/lib/stats";

export default async function PlayerPage(props: PageProps<"/players/[username]">) {
  const { username } = await props.params;
  const repo = getRepo();
  const players = await repo.listPlayers();
  const games = await repo.listGames();
  const rounds = (await Promise.all(games.map((game) => repo.listRounds(game.id)))).flat();
  const stats = computePlayerStats(players, games, rounds);
  const row = stats.find((item) => item.username.toLowerCase() === username.toLowerCase());

  if (!row) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/leaderboard" className="mb-3" />
      <PlayerStatsCard stats={row} />
    </main>
  );
}
