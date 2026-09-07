import { notFound } from "next/navigation";
import { getRepo } from "@/lib/supabase";
import { requireAccountId } from "@/lib/session";
import { EditRoundPageClient } from "./EditRoundPageClient";

export default async function EditRoundPage(
  props: PageProps<"/game/[id]/edit-round/[roundId]">,
) {
  const params = await props.params;
  const repo = getRepo(await requireAccountId());
  if (!(await repo.getGame(params.id))) notFound();
  // Ruka mora pripadati baš toj partiji, ne samo istom računu.
  const rounds = await repo.listRounds(params.id);
  if (!rounds.some((round) => round.id === params.roundId)) notFound();
  return <EditRoundPageClient gameId={params.id} roundId={params.roundId} />;
}
