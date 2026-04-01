"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { RoundEntryForm } from "@/components/RoundEntryForm";
import { getNextDealer } from "@/lib/dealer";
import { GAME_TARGET_SCORE } from "@/lib/scoring";
import { getGameScore, getWinningTeam } from "@/lib/scoring";
import type { Game, Player, Round } from "@/lib/types";

interface GamePayload {
  game: Game;
  rounds: Round[];
}

export function NewRoundPageClient({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
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

    setPlayers(playersBody.players ?? []);
    setGame(gameBody.game);
    setRounds(gameBody.rounds ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  if (error) {
    return <p className="p-4 text-rose-300">{error}</p>;
  }

  if (!game) {
    return <p className="p-4 text-emerald-100">Učitavanje unosa...</p>;
  }

  const playersById = new Map(players.map((player) => [player.id, player]));
  const nextDealerId = getNextDealer(game, rounds.length);
  const dealerName = playersById.get(nextDealerId)?.username ?? "Unknown";
  const winnerTeam = getWinningTeam(getGameScore(rounds));

  if (game.finishedAt || winnerTeam) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-20">
        <BackButton fallbackHref={`/game/${gameId}`} />
        <section className="rounded-2xl border border-lime-300/70 bg-lime-400/20 p-4 text-lime-100">
          <p className="text-lg font-bold">Partija je završena.</p>
          {winnerTeam ? <p className="mt-1 text-sm">Pobjednik je Tim {winnerTeam}.</p> : null}
          <button
            type="button"
            onClick={() => router.push(`/game/${gameId}`)}
            className="mt-3 w-full rounded-xl bg-lime-400 py-3 font-semibold text-emerald-950"
          >
            Nazad na partiju
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-20">
      <BackButton fallbackHref={`/game/${gameId}`} />
      <RoundEntryForm
        game={game}
        players={players}
        dealerName={dealerName}
        onSaved={({ gameFinished, winnerTeam, score }) => {
          const reachedTarget =
            (score?.teamA ?? 0) >= GAME_TARGET_SCORE || (score?.teamB ?? 0) >= GAME_TARGET_SCORE;
          const shouldGoHome = gameFinished || Boolean(winnerTeam) || reachedTarget;
          router.push(shouldGoHome ? "/" : `/game/${gameId}`);
        }}
        onCancel={() => router.push(`/game/${gameId}`)}
      />
    </main>
  );
}
