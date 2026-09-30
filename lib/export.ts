import { toCsv } from "@/lib/csv";
import { seasonOf } from "@/lib/rating";
import { getFinishedGameIds, getGameScore, getWinningTeam, groupRoundsByGame, resolveRoundPoints } from "@/lib/scoring";
import type { Game, Player, Round } from "@/lib/types";

export type ExportType = "games" | "rounds";

interface ExportInput {
  players: Player[];
  games: Game[];
  rounds: Round[];
  comments: Record<string, string>;
  /** "25/26" ili null za sve. */
  season: string | null;
}

/** Sve partije i ruke računa kao CSV, kronološki. Bodovi su kao u aplikaciji (sa zvanjima i štigljom). */
export function buildExportCsv(type: ExportType, input: ExportInput) {
  const nameOf = new Map(input.players.map((player) => [player.id, player.username]));
  const name = (id: string | null) => (id ? nameOf.get(id) ?? id : "");
  const games = input.games
    .filter((game) => !input.season || seasonOf(game.createdAt) === input.season)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const roundsByGame = groupRoundsByGame(input.rounds);
  const finished = getFinishedGameIds(input.games, input.rounds);

  if (type === "games") {
    return toCsv(
      ["id", "datum", "sezona", "zavrsena", "tim_a", "tim_b", "bodovi_a", "bodovi_b", "pobjednik", "broj_ruku", "komentar"],
      games.map((game) => {
        const rounds = roundsByGame.get(game.id) ?? [];
        const score = getGameScore(rounds);
        const winner = finished.has(game.id) ? getWinningTeam(score) : null;
        return [
          game.id,
          game.createdAt,
          seasonOf(game.createdAt),
          finished.has(game.id),
          game.teams.teamA.map(name).join(" + "),
          game.teams.teamB.map(name).join(" + "),
          score.teamA,
          score.teamB,
          winner ?? "",
          rounds.length,
          input.comments[game.id] ?? "",
        ];
      }),
    );
  }

  return toCsv(
    ["partija_id", "datum_partije", "ruka", "zvao", "tim_zvaca", "adut", "bodovi_a", "bodovi_b", "zvanja_a", "zvanja_b", "stiglja", "prosao"],
    games.flatMap((game) =>
      (roundsByGame.get(game.id) ?? []).map((round) => {
        const points = resolveRoundPoints(round);
        return [
          game.id,
          game.createdAt,
          round.roundNumber,
          name(round.callerPlayerId),
          round.callingTeam,
          round.calledSuit,
          points.teamA,
          points.teamB,
          round.zvanjaTeamA,
          round.zvanjaTeamB,
          round.stigliaTeam ?? "",
          round.callerSucceeded,
        ];
      }),
    ),
  );
}
