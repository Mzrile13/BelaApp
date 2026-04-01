import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { BackButton } from "@/components/BackButton";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { getRepo } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function HistoryPage() {
  noStore();
  const repo = getRepo();
  const players = await repo.listPlayers();
  const games = await repo.listGames();
  const roundsByGame = await Promise.all(games.map((game) => repo.listRounds(game.id)));
  const playersById = new Map(players.map((player) => [player.id, player.username]));

  const gamesWithRounds = games
    .map((game, index) => ({
      game,
      rounds: roundsByGame[index] ?? [],
      score: getGameScore(roundsByGame[index] ?? []),
    }))
    .filter((row) => {
      if (row.rounds.length === 0) return false;
      return row.game.finishedAt !== null || getWinningTeam(row.score) !== null;
    });

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/" className="mb-3" />
      <section className="card p-4">
        <h1 className="text-xl font-bold text-white">Povijest partija</h1>
        <p className="text-sm text-emerald-100/90">Pregled svih odigranih partija.</p>
      </section>

      <div className="mt-4 space-y-4">
        {gamesWithRounds.length === 0 ? (
          <section className="card p-4 text-sm text-emerald-100/90">Još nema odigranih rundi.</section>
        ) : (
          gamesWithRounds.map(({ game, rounds, score }) => {
            const winnerTeam = score.teamA === score.teamB ? null : score.teamA > score.teamB ? "A" : "B";
            return (
              <section key={game.id} className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    Partija {new Date(game.createdAt).toLocaleString("hr-HR")}
                  </p>
                  <Link
                    href={`/game/${game.id}?from=history`}
                    className="rounded-lg border border-emerald-500 px-2 py-1 text-xs font-semibold text-emerald-100"
                  >
                    Otvori
                  </Link>
                </div>
                <div className="rounded-xl bg-emerald-950/40 p-3 text-sm text-emerald-100">
                  <p
                    className={`font-semibold ${
                      winnerTeam === "A"
                        ? "text-white"
                        : winnerTeam === "B"
                          ? "text-emerald-300"
                          : "text-white"
                    }`}
                  >
                    Tim A: {game.teams.teamA.map((id) => playersById.get(id) ?? "Unknown").join(" + ")}
                    {winnerTeam === "A" ? (
                      <span className="ml-2 rounded-full bg-lime-300/20 px-2 py-0.5 text-xs text-lime-200">
                        pobjednik
                      </span>
                    ) : null}
                  </p>
                  <p
                    className={`mt-1 font-semibold ${
                      winnerTeam === "B"
                        ? "text-white"
                        : winnerTeam === "A"
                          ? "text-emerald-300"
                          : "text-white"
                    }`}
                  >
                    Tim B: {game.teams.teamB.map((id) => playersById.get(id) ?? "Unknown").join(" + ")}
                    {winnerTeam === "B" ? (
                      <span className="ml-2 rounded-full bg-lime-300/20 px-2 py-0.5 text-xs text-lime-200">
                        pobjednik
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-emerald-300">
                    Rezultat: A {score.teamA} : {score.teamB} B
                  </p>
                </div>
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}
