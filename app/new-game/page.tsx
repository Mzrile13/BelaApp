import { getRepo } from "@/lib/supabase";
import { requireAccountId } from "@/lib/session";
import { NewGameClient } from "./NewGameClient";

export const dynamic = "force-dynamic";

export default async function NewGamePage() {
  const repo = getRepo(await requireAccountId());
  const [players, groups, members] = await Promise.all([
    repo.listPlayers(),
    repo.listGroups(),
    repo.listAllGroupMembers(),
  ]);

  return <NewGameClient initialData={{ players, groups, members }} />;
}
