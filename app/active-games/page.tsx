import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
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
  const roundsByGame = await Promise.all(games.map((game) => repo.listRounds(game.id)));
  const playersById = new Map(players.map((player) => [player.id, player.username]));

  const activeGames = games
    .map((game, index) => {
      const rounds = roundsByGame[index] ?? [];
      const score = getGameScore(rounds);
      const winner = getWinningTeam(score);
      return { game, rounds, score, winner };
    })
    .filter(({ game, winner }) => game.finishedAt === null && winner === null);

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/" className="mb-3" />

      <section className="card p-4">
        <h1 className="text-xl font-bold text-white">Aktivne partije</h1>
        <p className="text-sm text-emerald-100/90">
          Odaberi partiju koju želiš nastaviti.
        </p>
      </section>

      <div className="mt-4 space-y-4">
        {activeGames.length === 0 ? (
          <section className="card p-4 text-sm text-emerald-100/90">
            Trenutno nema aktivnih partija.
          </section>
        ) : (
          activeGames.map(({ game, score, rounds }) => (
            <section key={game.id} className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">
                  Partija {new Date(game.createdAt).toLocaleString("hr-HR")}
                </p>
                <Link
                  href={`/game/${game.id}`}
                  className="rounded-lg border border-emerald-500 px-2 py-1 text-xs font-semibold text-emerald-100"
                >
                  Otvori
                </Link>
              </div>

              <div className="rounded-xl bg-emerald-950/40 p-3 text-sm text-emerald-100">
                <p className="font-semibold text-white">
                  Tim A: {game.teams.teamA.map((id) => playersById.get(id) ?? "Unknown").join(" + ")}
                </p>
                <p className="mt-1 font-semibold text-white">
                  Tim B: {game.teams.teamB.map((id) => playersById.get(id) ?? "Unknown").join(" + ")}
                </p>
                <p className="mt-1 text-emerald-300">
                  Rezultat: A {score.teamA} : {score.teamB} B
                </p>
                <p className="mt-1 text-xs text-emerald-200/80">Ruke: {rounds.length}</p>
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
