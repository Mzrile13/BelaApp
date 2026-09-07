import { z } from "zod";

// Račun = jedna grupa prijatelja s dijeljenim korisničkim imenom i lozinkom.
export const accountUsernameSchema = z
  .string()
  .trim()
  .min(3, "Korisničko ime mora imati barem 3 znaka")
  .max(24, "Korisničko ime je predugo")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Dozvoljena su slova, brojevi, točka, underscore i crtica",
  );

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const registerSchema = z
  .object({
    username: accountUsernameSchema,
    password: z
      .string()
      .min(8, "Lozinka mora imati barem 8 znakova")
      .max(200, "Lozinka je preduga"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Lozinke se ne podudaraju",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Upišite trenutnu lozinku"),
    newPassword: z
      .string()
      .min(8, "Nova lozinka mora imati barem 8 znakova")
      .max(200, "Lozinka je preduga"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Lozinke se ne podudaraju",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Nova lozinka mora biti različita od trenutne",
    path: ["newPassword"],
  });

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
  groupId: z.string().uuid("Neispravan group ID"),
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
