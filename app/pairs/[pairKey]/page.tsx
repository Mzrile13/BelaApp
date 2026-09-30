import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { PairStatsCard } from "@/components/PairStatsCard";
import { RevealList } from "@/components/RevealList";
import { getCachedAllStats, getCachedDataset } from "@/lib/cachedStats";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { getRepo } from "@/lib/supabase";
import { requireAccountId } from "@/lib/session";

export default async function PairPage(props: PageProps<"/pairs/[pairKey]">) {
  const { pairKey } = await props.params;
  const [playerAId, playerBId] = pairKey.split("__");
  if (!playerAId || !playerBId) notFound();

  const accountId = await requireAccountId();
  // Isto kao na stranici igrača: povijest i statistika parova dolaze iz istog
  // cachea koji puni leaderboard, umjesto punog scana po otvaranju. Redoslijed
  // je bitan — statistika se gradi nad datasetom, pa mu prvi await puni cache.
  const { players, games, rounds } = await getCachedDataset(accountId);
  const allStats = await getCachedAllStats(accountId);
  const roundsByGameId = new Map<string, typeof rounds>();
  for (const round of rounds) {
    const bucket = roundsByGameId.get(round.gameId) ?? [];
    bucket.push(round);
    roundsByGameId.set(round.gameId, bucket);
  }
  const stats = allStats.pairs.find(
    (row) =>
      (row.playerAId === playerAId && row.playerBId === playerBId) ||
      (row.playerAId === playerBId && row.playerBId === playerAId),
  );
  if (!stats) notFound();

  const playersById = new Map(players.map((player) => [player.id, player.username]));
  const pairGames = games
    .map((game) => ({
      game,
      rounds: roundsByGameId.get(game.id) ?? [],
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

  // Komentari su zaseban stupac; bez migracije stranica radi bez njih.
  const comments = pairGames.length
    ? await getRepo(accountId)
        .listGameComments(pairGames.map(({ game }) => game.id))
        .catch((): Record<string, string> => ({}))
    : {};

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/leaderboard/pairs" className="mb-3" />
      <PairStatsCard stats={stats} />

      <section className="card mt-4 p-4">
        <h2 className="text-lg font-semibold text-heading">Partije para</h2>
        <div className="mt-3">
          {pairGames.length === 0 ? (
            <p className="text-sm text-subtle">Par još nema odigranih partija.</p>
          ) : (
            <RevealList
              listClassName="space-y-2"
              items={pairGames.map(({ game, score }) => {
                const winner = getWinningTeam(score);
                const finished = game.finishedAt !== null || winner !== null;
                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between rounded-[14px] bg-well/45 px-3 py-2"
                  >
                  <div>
                    <p className="text-sm font-medium text-heading">
                      {new Date(game.createdAt).toLocaleString("hr-HR")}
                    </p>
                    <p className="text-xs text-soft">
                      A {score.teamA} : {score.teamB} B · {finished ? "završena" : "u tijeku"}
                    </p>
                    <p className="text-xs text-muted">
                      {game.teams.teamA.map((id) => playersById.get(id) ?? "Unknown").join(" + ")} vs{" "}
                      {game.teams.teamB.map((id) => playersById.get(id) ?? "Unknown").join(" + ")}
                    </p>
                    {comments[game.id] ? (
                      <p className="mt-1 whitespace-pre-wrap break-words text-xs italic text-accent">
                        “{comments[game.id]}”
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href={`/game/${game.id}?from=history`}
                    className="rounded-lg border border-subtle/30 px-2 py-1 text-xs font-semibold text-soft"
                  >
                    Otvori
                  </Link>
                </div>
                );
              })}
            />
          )}
        </div>
      </section>
    </main>
  );
}
