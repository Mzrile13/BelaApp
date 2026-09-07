import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { getDealerForRound } from "@/lib/dealer";
import { loadGameBundle } from "@/lib/gameData";
import { requireAccountId } from "@/lib/session";
import { EditRoundPageClient } from "./EditRoundPageClient";

export default async function EditRoundPage(
  props: PageProps<"/game/[id]/edit-round/[roundId]">,
) {
  const params = await props.params;
  const bundle = await loadGameBundle(await requireAccountId(), params.id);
  if (!bundle) notFound();

  const { game, rounds, players } = bundle;
  // Ruka mora pripadati baš toj partiji, ne samo istom računu.
  const round = rounds.find((row) => row.id === params.roundId);
  if (!round) notFound();

  const dealerId = getDealerForRound(game, round.roundNumber);
  const dealerName = players.find((player) => player.id === dealerId)?.username ?? "Unknown";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-20">
      <BackButton fallbackHref={`/game/${params.id}`} />
      <EditRoundPageClient
        game={game}
        players={players}
        round={round}
        dealerName={dealerName}
      />
    </main>
  );
}
