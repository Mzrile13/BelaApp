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

  function backToGame(result?: { gameFinished: boolean }) {
    // Bez router.refresh(): dinamičke stranice se od Next 15 ne drže u
    // klijentskom cacheu (staleTimes.dynamic = 0), pa push već dohvaća svježu
    // stranicu. refresh() odmah iza njega bio je drugi, suvišan render na
    // serveru nakon svake ruke.
    // `?pobjeda=1` pušta konfete samo kad je ova ruka završila partiju.
    router.push(`/game/${game.id}${result?.gameFinished ? "?pobjeda=1" : ""}`);
  }

  return (
    <RoundEntryForm
      game={game}
      players={players}
      dealerName={dealerName}
      onSaved={backToGame}
      onCancel={() => backToGame()}
    />
  );
}
