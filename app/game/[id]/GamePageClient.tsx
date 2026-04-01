"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { GameHeader } from "@/components/GameHeader";
import { ScoreTimeline } from "@/components/ScoreTimeline";
import { getNextDealer } from "@/lib/dealer";
import { getWinningTeam } from "@/lib/scoring";
import type { Game, Player, Round } from "@/lib/types";

interface GamePayload {
  game: Game;
  rounds: Round[];
  score: { teamA: number; teamB: number };
}

export function GamePageClient({ gameId }: { gameId: string }) {
  const searchParams = useSearchParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [payload, setPayload] = useState<GamePayload | null>(null);
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
    setPayload(gameBody);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  if (error) {
    return <p className="p-4 text-rose-300">{error}</p>;
  }

  if (!payload) {
    return <p className="p-4 text-emerald-100">Učitavanje partije...</p>;
  }

  const playersById = new Map(players.map((player) => [player.id, player]));
  const nextDealerId = getNextDealer(payload.game, payload.rounds.length);
  const winnerTeam = getWinningTeam(payload.score);
  const backFallback = searchParams.get("from") === "history" ? "/history" : "/";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-20">
      <BackButton fallbackHref={backFallback} />
      <GameHeader
        game={payload.game}
        playersById={playersById}
        score={payload.score}
        dealerPlayerId={nextDealerId}
      />
      {winnerTeam ? (
        <div className="rounded-2xl border border-lime-300/70 bg-lime-400/20 px-4 py-3 text-center font-semibold text-lime-100">
          Partija je završena. Pobjednik je Tim {winnerTeam}.
        </div>
      ) : (
        <Link
          href={`/game/${gameId}/new-round`}
          className="flex items-center justify-center gap-2 rounded-2xl bg-lime-400 py-3 font-semibold text-emerald-950 shadow-lg shadow-emerald-950/30"
        >
          <PlusCircle size={18} />
          Unesi novu ruku
        </Link>
      )}
      <ScoreTimeline rounds={payload.rounds} game={payload.game} playersById={playersById} />
    </main>
  );
}
