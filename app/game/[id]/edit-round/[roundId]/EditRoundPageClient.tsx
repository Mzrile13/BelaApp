"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { RoundEntryForm } from "@/components/RoundEntryForm";
import { getDealerForRound } from "@/lib/dealer";
import type { Game, Player, Round } from "@/lib/types";

interface GamePayload {
  game: Game;
  rounds: Round[];
}

export function EditRoundPageClient({ gameId, roundId }: { gameId: string; roundId: string }) {
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const [playersResponse, gameResponse] = await Promise.all([
      fetch("/api/players"),
      fetch(`/api/games/${gameId}`),
    ]);

    if (!gameResponse.ok) {
      setError("Partija nije pronađena");
      return;
    }

    const playersBody = (await playersResponse.json()) as { players: Player[] };
    const gameBody = (await gameResponse.json()) as GamePayload;
    const targetRound = (gameBody.rounds ?? []).find((row) => row.id === roundId) ?? null;

    if (!targetRound) {
      setError("Ruka nije pronađena");
      return;
    }

    setPlayers(playersBody.players ?? []);
    setGame(gameBody.game);
    setRound(targetRound);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, roundId]);

  if (error) {
    return <p className="p-4 text-rose-300">{error}</p>;
  }

  if (!game || !round) {
    return <p className="p-4 text-emerald-100">Učitavanje unosa...</p>;
  }

  const playersById = new Map(players.map((player) => [player.id, player]));
  const dealerId = getDealerForRound(game, round.roundNumber);
  const dealerName = playersById.get(dealerId)?.username ?? "Unknown";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-20">
      <BackButton fallbackHref={`/game/${gameId}`} />
      <RoundEntryForm
        game={game}
        players={players}
        dealerName={dealerName}
        initialRound={round}
        submitEndpoint={`/api/rounds/${round.id}`}
        submitMethod="PATCH"
        submitLabel="Spremi izmjene"
        onSaved={() => {
          router.push(`/game/${gameId}`);
        }}
        onCancel={() => router.push(`/game/${gameId}`)}
      />
    </main>
  );
}
