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

/**
 * Zvanja se plaćaju samo u koracima 20/50/100/150/200 (bela, terca, ... , četiri
 * dečka), pa je legalan ukupan zbroj svaka kombinacija tih vrijednosti unutar
 * broja karata koje jedan tim može držati.
 *
 * Prije se ovo provjeravalo peterostrukom petljom (~17k iteracija) i to do šest
 * puta po upisu ruke. Skup dosezivih zbrojeva je konstanta, pa se izračuna
 * jednom pri učitavanju modula, a sama provjera postane O(1).
 */
const ZVANJA_MAX = 700; // isti gornji limit kao u shemi ispod
const ALLOWED_ZVANJA_TOTALS: ReadonlySet<number> = (() => {
  const totals = new Set<number>();
  for (let count200 = 0; count200 <= 1; count200 += 1) {
    for (let count150 = 0; count150 <= 1; count150 += 1) {
      for (let count100 = 0; count100 <= 7; count100 += 1) {
        for (let count50 = 0; count50 <= 14; count50 += 1) {
          for (let count20 = 0; count20 <= 35; count20 += 1) {
            const sum =
              count20 * 20 + count50 * 50 + count100 * 100 + count150 * 150 + count200 * 200;
            if (sum <= ZVANJA_MAX) totals.add(sum);
          }
        }
      }
    }
  }
  return totals;
})();

export function isAllowedZvanjaTotal(total: number) {
  return ALLOWED_ZVANJA_TOTALS.has(total);
}

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
