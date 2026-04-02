import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { PairStatsCard } from "@/components/PairStatsCard";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { computePairStats } from "@/lib/stats";
import { getRepo } from "@/lib/supabase";

export default async function PairPage(props: PageProps<"/pairs/[pairKey]">) {
  const { pairKey } = await props.params;
  const [playerAId, playerBId] = pairKey.split("__");
  if (!playerAId || !playerBId) notFound();

  const repo = getRepo();
  const players = await repo.listPlayers();
  const games = await repo.listGames();
  const roundsByGame = await Promise.all(games.map((game) => repo.listRounds(game.id)));
  const rounds = roundsByGame.flat();
  const allPairStats = computePairStats(players, games, rounds);
  const stats = allPairStats.find(
    (row) =>
      (row.playerAId === playerAId && row.playerBId === playerBId) ||
      (row.playerAId === playerBId && row.playerBId === playerAId),
  );
  if (!stats) notFound();

  const playersById = new Map(players.map((player) => [player.id, player.username]));
  const pairGames = games
    .map((game, index) => ({
      game,
      rounds: roundsByGame[index] ?? [],
    }))
    .filter(({ game }) => {
      const teamA = new Set(game.teams.teamA);
      const teamB = new Set(game.teams.teamB);
      return (
        (teamA.has(playerAId) && teamA.has(playerBId)) ||
        (teamB.has(playerAId) && teamB.has(playerBId))
      );
    })
    .map(({ game, rounds }) => ({
      game,
      rounds,
      score: getGameScore(rounds),
    }))
    .sort((a, b) => b.game.createdAt.localeCompare(a.game.createdAt));

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/leaderboard/pairs" className="mb-3" />
      <PairStatsCard stats={stats} />

      <section className="card mt-4 p-4">
        <h2 className="text-lg font-semibold text-white">Partije para</h2>
        <div className="mt-3 space-y-2">
          {pairGames.length === 0 ? (
            <p className="text-sm text-emerald-100/80">Par još nema odigranih partija.</p>
          ) : (
            pairGames.map(({ game, score }) => {
              const winner = getWinningTeam(score);
              const finished = game.finishedAt !== null || winner !== null;
              return (
                <div
                  key={game.id}
                  className="flex items-center justify-between rounded-xl bg-emerald-950/40 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {new Date(game.createdAt).toLocaleString("hr-HR")}
                    </p>
                    <p className="text-xs text-emerald-200">
                      A {score.teamA} : {score.teamB} B · {finished ? "završena" : "u tijeku"}
                    </p>
                    <p className="text-xs text-emerald-300/90">
                      {game.teams.teamA.map((id) => playersById.get(id) ?? "Unknown").join(" + ")} vs{" "}
                      {game.teams.teamB.map((id) => playersById.get(id) ?? "Unknown").join(" + ")}
                    </p>
                  </div>
                  <Link
                    href={`/game/${game.id}?from=history`}
                    className="rounded-lg border border-emerald-500 px-2 py-1 text-xs font-semibold text-emerald-100"
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
