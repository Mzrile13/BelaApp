import { describe, expect, it } from "vitest";
import { computeRatings, expectedScore } from "../lib/rating";
import type { Game, Round } from "../lib/types";

/**
 * Regresijski test protiv sustavnog stiskanja ljestvice.
 *
 * Zada se prava jačina igrača NA ELO SKALI, generiraju se ishodi točno po
 * modelu koji rejting pretpostavlja, i mjeri se nagib regresije procijenjenog
 * na pravi rejting. Nepristran procjenitelj daje nagib 1.0; sve bitno ispod
 * znači da nešto sustavno vuče rejtinge prema sredini.
 *
 * Ovaj test je nastao jer je 538-ovo prigušenje favorita radilo upravo to:
 * asimetrično smanjuje korak kad pobijedi favorit, pa mijenja ravnotežu, a ne
 * samo brzinu. S njim je nagib bio ~0.80, bez njega ~0.91.
 */

const TRUE_RATINGS: Record<string, number> = {
  a: 1700, b: 1620, c: 1560, d: 1520, e: 1480, f: 1440, g: 1380, h: 1300,
};
const names = Object.keys(TRUE_RATINGS);

function makePrng(initial: number) {
  let seed = initial;
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

function simulate(gameCount: number, initialSeed: number) {
  const rnd = makePrng(initialSeed);
  const games: Game[] = [];
  const rounds: Round[] = [];

  for (let index = 0; index < gameCount; index += 1) {
    const shuffled = [...names].sort(() => rnd() - 0.5);
    const teamA: [string, string] = [shuffled[0], shuffled[1]];
    const teamB: [string, string] = [shuffled[2], shuffled[3]];
    const ratingA = (TRUE_RATINGS[teamA[0]] + TRUE_RATINGS[teamA[1]]) / 2;
    const ratingB = (TRUE_RATINGS[teamB[0]] + TRUE_RATINGS[teamB[1]]) / 2;
    const teamAWins = rnd() < expectedScore(ratingA, ratingB);
    // Margina korelira s razlikom u jačini — upravo scenarij u kojem se
    // prigušenje favorita činilo potrebnim.
    const edge = Math.abs(ratingA - ratingB) / 400;
    const loserScore = Math.round(
      Math.max(120, Math.min(970, 1001 * (0.72 - edge * 0.22) - rnd() * 260)),
    );
    const day = String((index % 27) + 1).padStart(2, "0");
    const month = String((Math.floor(index / 27) % 12) + 1).padStart(2, "0");
    const createdAt = `2026-${month}-${day}T${String(index % 24).padStart(2, "0")}:00:00.000Z`;
    const id = `sim-${index}`;

    games.push({
      id,
      dealerPlayerId: teamA[0],
      createdAt,
      finishedAt: createdAt,
      teams: { teamA, teamB },
    });
    rounds.push({
      id: `${id}-r1`,
      gameId: id,
      roundNumber: 1,
      callerPlayerId: teamA[0],
      calledSuit: "herc",
      callingTeam: "A",
      pointsTeamA: teamAWins ? 1001 : loserScore,
      pointsTeamB: teamAWins ? loserScore : 1001,
      zvanjaTeamA: 0,
      zvanjaTeamB: 0,
      zvanjaPlayerIdA: null,
      zvanjaPlayerIdB: null,
      stigliaTeam: null,
      callerSucceeded: true,
      createdAt,
    });
  }

  return { games, rounds };
}

/** Nagib regresije procijenjenog rejtinga na pravi; 1.0 = nepristrano. */
function recoverySlope(gameCount: number, initialSeed: number) {
  const { games, rounds } = simulate(gameCount, initialSeed);
  const result = computeRatings(games, rounds);
  const estimated = names.map((name) => result.byPlayer.get(name)?.rating ?? 1500);
  const trueValues = names.map((name) => TRUE_RATINGS[name]);
  const meanTrue = trueValues.reduce((sum, value) => sum + value, 0) / names.length;
  const meanEstimated = estimated.reduce((sum, value) => sum + value, 0) / names.length;

  let covariance = 0;
  let variance = 0;
  for (let i = 0; i < names.length; i += 1) {
    covariance += (trueValues[i] - meanTrue) * (estimated[i] - meanEstimated);
    variance += (trueValues[i] - meanTrue) ** 2;
  }
  return covariance / variance;
}

function meanSlope(gameCount: number, runs = 40) {
  const slopes = Array.from({ length: runs }, (_, i) => recoverySlope(gameCount, 7 + i * 9973));
  return slopes.reduce((sum, value) => sum + value, 0) / slopes.length;
}

describe("rating — rekonstrukcija prave jačine", () => {
  it("ne stišće ljestvicu sustavno prema sredini", () => {
    // Prosjek preko 40 pokretanja; pojedinačno pokretanje je previše šumno.
    // Mjereno: ~0.91 na 60 partija, ~0.93 na 150, ~0.86 na 400.
    expect(meanSlope(60)).toBeGreaterThan(0.85);
    expect(meanSlope(150)).toBeGreaterThan(0.88);
  });

  it("poredak je stabilan i na maloj količini partija", () => {
    const { games, rounds } = simulate(150, 7);
    const result = computeRatings(games, rounds);
    const best = result.byPlayer.get("a")?.rating ?? 0;
    const worst = result.byPlayer.get("h")?.rating ?? 0;
    expect(best).toBeGreaterThan(worst);
  });
});
