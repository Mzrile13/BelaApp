import { notFound } from "next/navigation";
import { getRepo } from "@/lib/supabase";
import { requireAccountId } from "@/lib/session";
import { NewRoundPageClient } from "./NewRoundPageClient";

export default async function NewRoundPage(props: PageProps<"/game/[id]/new-round">) {
  const params = await props.params;
  const repo = getRepo(await requireAccountId());
  if (!(await repo.getGame(params.id))) notFound();
  return <NewRoundPageClient gameId={params.id} />;
}
