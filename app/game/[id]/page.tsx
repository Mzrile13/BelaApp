import { GamePageClient } from "./GamePageClient";

export default async function GamePage(props: PageProps<"/game/[id]">) {
  const params = await props.params;
  return <GamePageClient gameId={params.id} />;
}
