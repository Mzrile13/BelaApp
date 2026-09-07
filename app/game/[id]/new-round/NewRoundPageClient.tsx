"use client";

import { useRouter } from "next/navigation";
import { RoundEntryForm } from "@/components/RoundEntryForm";
import type { Game, Player } from "@/lib/types";

/**
 * Sav podatak dolazi s poslužitelja kao prop — ovaj sloj postoji samo zbog
 * navigacije nakon spremanja, pa forma više ne čeka dva fetcha nakon hydrationa.
 */
export function NewRoundPageClient({
  game,
  players,
  dealerName,
}: {
  game: Game;
  players: Player[];
  dealerName: string;
}) {
  const router = useRouter();

  function backToGame() {
    // `refresh` je nužan jer je stranica partije sada server-renderirana:
    // bez njega bi se vratila iz klijentskog cachea, bez upravo upisane ruke.
    router.push(`/game/${game.id}`);
    router.refresh();
  }

  return (
    <RoundEntryForm
      game={game}
      players={players}
      dealerName={dealerName}
      onSaved={backToGame}
      onCancel={backToGame}
    />
  );
}
