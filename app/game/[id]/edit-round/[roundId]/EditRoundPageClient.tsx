"use client";

import { useRouter } from "next/navigation";
import { RoundEntryForm } from "@/components/RoundEntryForm";
import type { Game, Player, Round } from "@/lib/types";

/**
 * Kao i kod unosa nove ruke: podaci stižu s poslužitelja, klijent radi samo
 * navigaciju nakon spremanja.
 */
export function EditRoundPageClient({
  game,
  players,
  round,
  dealerName,
}: {
  game: Game;
  players: Player[];
  round: Round;
  dealerName: string;
}) {
  const router = useRouter();

  function backToGame() {
    router.push(`/game/${game.id}`);
    router.refresh();
  }

  return (
    <RoundEntryForm
      game={game}
      players={players}
      dealerName={dealerName}
      initialRound={round}
      submitEndpoint={`/api/rounds/${round.id}`}
      submitMethod="PATCH"
      submitLabel="Spremi izmjene"
      onSaved={backToGame}
      onCancel={backToGame}
    />
  );
}
