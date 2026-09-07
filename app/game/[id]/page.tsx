import Link from "next/link";
import { notFound } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { GameHeader } from "@/components/GameHeader";
import { ScoreTimeline } from "@/components/ScoreTimeline";
import { getNextDealer } from "@/lib/dealer";
import { loadGameBundle } from "@/lib/gameData";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { requireAccountId } from "@/lib/session";

export default async function GamePage(props: PageProps<"/game/[id]">) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const bundle = await loadGameBundle(await requireAccountId(), params.id);
  if (!bundle) notFound();

  const { game, rounds, players } = bundle;
  const playersById = new Map(players.map((player) => [player.id, player]));
  const score = getGameScore(rounds);
  const nextDealerId = getNextDealer(game, rounds.length);
  const winnerTeam = getWinningTeam(score);
  const fromHistory = searchParams?.from === "history";

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
          Partija je završena. Pobjednik je Tim {winnerTeam}.
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
      <ScoreTimeline
        rounds={rounds}
        game={game}
        playersById={playersById}
        canEditRounds={!fromHistory}
      />
    </main>
  );
}
