import { expect, type APIRequestContext, type Page } from "@playwright/test";

export interface Seeded {
  groupId: string;
  players: Array<{ id: string; username: string }>;
}

/** Jedinstveno ime po testu, jer svi testovi dijele isti BELA_DATA_DIR. */
export function uniqueName(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
}

async function postJson<T>(request: APIRequestContext, url: string, data: unknown): Promise<T> {
  const response = await request.post(url, { data });
  expect(response.ok(), `${url}: ${await response.text()}`).toBeTruthy();
  return (await response.json()) as T;
}

/** Registrira račun kroz UI formu, da je i taj tok pokriven. */
export async function registerAccount(page: Page, username = uniqueName("e2e")) {
  const password = "lozinka-za-test";
  await page.goto("/register");
  await page.getByLabel(/korisničko ime/i).fill(username);
  await page.getByLabel(/^lozinka$/i).fill(password);
  await page.getByLabel(/ponovi|potvrdi/i).fill(password);
  await page.getByRole("button", { name: /napravi grupu/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/register"));
  return { username, password };
}

/** Četiri igrača u jednoj grupi, preko API-ja (cookie sesije dijeli se s page-om). */
export async function seedGroup(page: Page, names = ["Ana", "Bruno", "Cvita", "Duje"]): Promise<Seeded> {
  const suffix = Math.floor(Math.random() * 1e5).toString(36);
  const { group } = await postJson<{ group: { id: string } }>(page.request, "/api/groups", {
    name: `Ekipa ${suffix}`,
  });
  const players: Seeded["players"] = [];
  for (const name of names) {
    const { player } = await postJson<{ player: { id: string; username: string } }>(
      page.request,
      "/api/players",
      { username: `${name}_${suffix}` },
    );
    await postJson(page.request, `/api/groups/${group.id}/players`, { playerId: player.id });
    players.push(player);
  }
  return { groupId: group.id, players };
}

export async function createGame(page: Page, seeded: Seeded) {
  const [a, b, c, d] = seeded.players;
  const { game } = await postJson<{ game: { id: string } }>(page.request, "/api/games", {
    groupId: seeded.groupId,
    dealerPlayerId: a.id,
    teamA: [a.id, b.id],
    teamB: [c.id, d.id],
  });
  return game.id;
}

/**
 * Upisuje ruku preko API-ja. Tim A zove i prolazi s `pointsA` čistih bodova.
 * Vraća odgovor rute (gameFinished, winnerTeam, score).
 */
export async function addRound(
  page: Page,
  gameId: string,
  seeded: Seeded,
  opts: { pointsA: number; caller?: number; zvanjaA?: number } = { pointsA: 120 },
) {
  const [a, b, c, d] = seeded.players;
  const caller = seeded.players[opts.caller ?? 0];
  const zvanjaA = opts.zvanjaA ?? 0;
  return postJson<{ gameFinished: boolean; winnerTeam: "A" | "B" | null }>(
    page.request,
    "/api/rounds",
    {
      gameId,
      callerPlayerId: caller.id,
      calledSuit: "herc",
      pointsTeamA: opts.pointsA,
      pointsTeamB: 162 - opts.pointsA,
      zvanjaTeamA: zvanjaA,
      zvanjaTeamB: 0,
      zvanjaPlayerIdA: zvanjaA ? a.id : null,
      zvanjaPlayerIdB: null,
      zvanjaByPlayerA: [
        { playerId: a.id, points: zvanjaA },
        { playerId: b.id, points: 0 },
      ],
      zvanjaByPlayerB: [
        { playerId: c.id, points: 0 },
        { playerId: d.id, points: 0 },
      ],
      stigliaTeam: null,
    },
  );
}

/** Igra ruke dok Tim A ne dođe do 1001 (Tim A uvijek zove i prolazi). */
export async function playToFinish(page: Page, gameId: string, seeded: Seeded) {
  for (let i = 0; i < 20; i += 1) {
    const result = await addRound(page, gameId, seeded, { pointsA: 150, caller: i % 2 === 0 ? 0 : 1, zvanjaA: 50 });
    if (result.gameFinished) return result;
  }
  throw new Error("Partija nije završila u 20 ruku");
}
