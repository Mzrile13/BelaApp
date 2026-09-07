import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { getNextDealer } from "@/lib/dealer";
import { loadGameBundle } from "@/lib/gameData";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import { requireAccountId } from "@/lib/session";
import { NewRoundPageClient } from "./NewRoundPageClient";

export default async function NewRoundPage(props: PageProps<"/game/[id]/new-round">) {
  const params = await props.params;
  const bundle = await loadGameBundle(await requireAccountId(), params.id);
  if (!bundle) notFound();

  const { game, rounds, players } = bundle;
  const winnerTeam = getWinningTeam(getGameScore(rounds));

  if (game.finishedAt || winnerTeam) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-20">
        <BackButton fallbackHref={`/game/${params.id}`} />
        <section className="rounded-[14px] border border-[rgba(201,217,160,0.4)] bg-[rgba(201,217,160,0.10)] p-4 text-[#eef6ea]">
          <p className="text-lg font-bold">Partija je završena.</p>
          {winnerTeam ? <p className="mt-1 text-sm">Pobjednik je Tim {winnerTeam}.</p> : null}
          <Link
            href={`/game/${params.id}`}
            className="btn-accent mt-3 block w-full rounded-xl py-3 text-center font-semibold"
          >
            Nazad na partiju
          </Link>
        </section>
      </main>
    );
  }

  const dealerId = getNextDealer(game, rounds.length);
  const dealerName = players.find((player) => player.id === dealerId)?.username ?? "Unknown";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-20">
      <BackButton fallbackHref={`/game/${params.id}`} />
      <NewRoundPageClient game={game} players={players} dealerName={dealerName} />
    </main>
  );
}
