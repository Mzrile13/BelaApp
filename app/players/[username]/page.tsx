import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { PlayerStatsCard } from "@/components/PlayerStatsCard";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { getRepo } from "@/lib/supabase";
import { computePlayerStats } from "@/lib/stats";

export default async function PlayerPage(props: PageProps<"/players/[username]">) {
  const { username } = await props.params;
  const repo = getRepo();
  const players = await repo.listPlayers();
  const games = await repo.listGames();
  const roundsByGame = await Promise.all(games.map((game) => repo.listRounds(game.id)));
  const rounds = roundsByGame.flat();
  const stats = computePlayerStats(players, games, rounds);
  const row = stats.find((item) => item.username.toLowerCase() === username.toLowerCase());

  if (!row) notFound();

  const player = players.find((item) => item.id === row.playerId);
  if (!player) notFound();
  const playersById = new Map(players.map((item) => [item.id, item.username]));
  const playerGames = games
    .map((game, index) => ({
      game,
      rounds: roundsByGame[index] ?? [],
    }))
    .filter(({ game }) => game.teams.teamA.includes(player.id) || game.teams.teamB.includes(player.id))
    .map(({ game, rounds }) => ({
      game,
      rounds,
      score: getGameScore(rounds),
    }))
    .sort((a, b) => b.game.createdAt.localeCompare(a.game.createdAt));

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/leaderboard" className="mb-3" />
      <PlayerStatsCard stats={row} />
      <section className="card mt-4 p-4">
        <h2 className="text-lg font-semibold text-[#f7fbf6]">Partije igrača</h2>
        <div className="mt-3 space-y-2">
          {playerGames.length === 0 ? (
            <p className="text-sm text-[#a9c2b3]">Igrač još nema odigranih partija.</p>
          ) : (
            playerGames.map(({ game, score }) => {
              const winner = getWinningTeam(score);
              const finished = game.finishedAt !== null || winner !== null;
              return (
                <div
                  key={game.id}
                  className="flex items-center justify-between rounded-[14px] bg-[rgba(6,20,16,0.45)] px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-[#f2f5f0]">
                      {new Date(game.createdAt).toLocaleString("hr-HR")}
                    </p>
                    <p className="text-xs text-[#dcece3]">
                      A {score.teamA} : {score.teamB} B · {finished ? "završena" : "u tijeku"}
                    </p>
                    <p className="text-xs text-[#8fa89b]">
                      {game.teams.teamA.map((id) => playersById.get(id) ?? "Unknown").join(" + ")} vs{" "}
                      {game.teams.teamB.map((id) => playersById.get(id) ?? "Unknown").join(" + ")}
                    </p>
                  </div>
                  <Link
                    href={`/game/${game.id}?from=history`}
                    className="rounded-lg border border-[rgba(169,194,179,0.3)] px-2 py-1 text-xs font-semibold text-[#dcece3]"
                  >
                    Otvori
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
