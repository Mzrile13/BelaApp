import { notFound } from "next/navigation";
import { getRepo } from "@/lib/supabase";
import { requireAccountId } from "@/lib/session";
import { GamePageClient } from "./GamePageClient";

export default async function GamePage(props: PageProps<"/game/[id]">) {
  const params = await props.params;
  // Podaci se dohvaćaju na klijentu, ali vlasništvo se provjerava ovdje — inače
  // tuđi link vrati praznu ljusku stranice umjesto 404.
  const repo = getRepo(await requireAccountId());
  if (!(await repo.getGame(params.id))) notFound();
  return <GamePageClient gameId={params.id} />;
}
