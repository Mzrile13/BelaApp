import { NewRoundPageClient } from "./NewRoundPageClient";

export default async function NewRoundPage(props: PageProps<"/game/[id]/new-round">) {
  const params = await props.params;
  return <NewRoundPageClient gameId={params.id} />;
}
