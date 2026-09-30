import Link from "next/link";
import { notFound } from "next/navigation";
import { PlusCircle, RotateCcw } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { GameHeader } from "@/components/GameHeader";
import { GameComment } from "@/components/GameComment";
import { ScoreTimeline } from "@/components/ScoreTimeline";
import { getNextDealer } from "@/lib/dealer";
import { loadGameBundle } from "@/lib/gameData";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { getRepo } from "@/lib/supabase";
import { requireAccountId } from "@/lib/session";

export default async function GamePage(props: PageProps<"/game/[id]">) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const accountId = await requireAccountId();
  const bundle = await loadGameBundle(accountId, params.id);
  if (!bundle) notFound();

  const { game, rounds, players } = bundle;
  const playersById = new Map(players.map((player) => [player.id, player]));
  const score = getGameScore(rounds);
  const nextDealerId = getNextDealer(game, rounds.length);
  const winnerTeam = getWinningTeam(score);
  const fromHistory = searchParams?.from === "history";
  // Zaseban upit (ne dio getGame) da stranice ne ovise o stupcu `comment`.
  const comment = winnerTeam
    ? await getRepo(accountId).getGameComment(game.id).catch(() => null)
    : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-20">
      <BackButton fallbackHref={fromHistory ? "/history" : "/"} />
      <GameHeader
        game={game}
        playersById={playersById}
        score={score}
        dealerPlayerId={nextDealerId}
      />
      {winnerTeam ? (
        <div className="rounded-[14px] border border-[rgba(201,217,160,0.4)] bg-[rgba(201,217,160,0.10)] px-4 py-3 text-center font-semibold text-[#eef6ea]">
          <p>Partija je završena. Pobjednik je Tim {winnerTeam}.</p>
          <Link
            href={`/new-game?rematch=${game.id}`}
            className="btn-accent mt-3 flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold"
          >
            <RotateCcw size={18} />
            Revanš
          </Link>
        </div>
      ) : (
        <Link
          href={`/game/${params.id}/new-round`}
          className="btn-accent flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold"
        >
          <PlusCircle size={18} />
          Unesi novu ruku
        </Link>
      )}
      {winnerTeam ? <GameComment gameId={game.id} initialComment={comment} /> : null}
      <ScoreTimeline
        rounds={rounds}
        game={game}
        playersById={playersById}
        canEditRounds={!fromHistory}
      />
    </main>
  );
}
