import { z } from "zod";
import { getRepo } from "@/lib/supabase";
import { requireAccountId } from "@/lib/session";
import { NewGameClient, type NewGameInitialData } from "./NewGameClient";

export const dynamic = "force-dynamic";

export default async function NewGamePage(props: PageProps<"/new-game">) {
  const searchParams = await props.searchParams;
  const repo = getRepo(await requireAccountId());
  const rematchParam = searchParams?.rematch;
  // Neispravan id ne smije stići do baze (uuid stupac bi bacio grešku).
  const rematchId =
    typeof rematchParam === "string" && z.string().uuid().safeParse(rematchParam).success
      ? rematchParam
      : "";
  const [players, groups, members, rematchGame] = await Promise.all([
    repo.listPlayers(),
    repo.listGroups(),
    repo.listAllGroupMembers(),
    rematchId ? repo.getGame(rematchId) : Promise.resolve(null),
  ]);

  // Partija ne pamti grupu, pa je za revanš tražimo: prva grupa koja i dalje
  // sadrži sva četiri igrača. Ako je nema, korisnik ide običnim tokom.
  let rematch: NewGameInitialData["rematch"];
  if (rematchGame) {
    const { teamA, teamB } = rematchGame.teams;
    const ids = [...teamA, ...teamB];
    const group = groups.find((candidate) => {
      const memberIds = new Set((members[candidate.id] ?? []).map((player) => player.id));
      return ids.every((id) => memberIds.has(id));
    });
    if (group) rematch = { groupId: group.id, teamA, teamB };
  }

  return <NewGameClient initialData={{ players, groups, members, rematch }} />;
}
