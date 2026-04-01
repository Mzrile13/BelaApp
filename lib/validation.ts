import { z } from "zod";

export const createPlayerSchema = z.object({
  username: z
    .string()
    .min(3, "Username mora imati barem 3 znaka")
    .max(24, "Username je predug")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Dozvoljena su slova, brojevi, underscore i crtica",
    ),
});

export const createGameSchema = z.object({
  dealerPlayerId: z.string().uuid("Neispravan dealer ID"),
  teamA: z.tuple([z.string().uuid(), z.string().uuid()]),
  teamB: z.tuple([z.string().uuid(), z.string().uuid()]),
});

export const createRoundSchema = z.object({
  gameId: z.string().uuid("Neispravan game ID"),
  callerPlayerId: z.string().uuid("Neispravan caller ID"),
  calledSuit: z.enum(["karo", "herc", "pik", "tref"]),
  pointsTeamA: z.number().int().min(0).max(162),
  pointsTeamB: z.number().int().min(0).max(162),
  zvanjaTeamA: z.number().int().min(0).max(700),
  zvanjaTeamB: z.number().int().min(0).max(700),
  zvanjaPlayerIdA: z.string().uuid().nullable(),
  zvanjaPlayerIdB: z.string().uuid().nullable(),
  zvanjaByPlayerA: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        points: z.number().int().min(0).max(700),
      }),
    )
    .max(2)
    .optional(),
  zvanjaByPlayerB: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        points: z.number().int().min(0).max(700),
      }),
    )
    .max(2)
    .optional(),
  stigliaTeam: z.enum(["A", "B"]).nullable(),
});
