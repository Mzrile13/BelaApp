import { EditRoundPageClient } from "./EditRoundPageClient";

export default async function EditRoundPage(
  props: PageProps<"/game/[id]/edit-round/[roundId]">,
) {
  const params = await props.params;
  return <EditRoundPageClient gameId={params.id} roundId={params.roundId} />;
}
