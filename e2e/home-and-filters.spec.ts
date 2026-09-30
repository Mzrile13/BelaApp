import { expect, test } from "@playwright/test";
import { createGame, playToFinish, registerAccount, seedGroup } from "./helpers";

test("Nastavi partiju prati stvaranje i završetak partije odmah", async ({ page }) => {
  await registerAccount(page);
  const seeded = await seedGroup(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: /nastavi partiju/i })).toHaveCount(0);

  const gameId = await createGame(page, seeded);
  await page.goto("/");
  await expect(page.getByRole("link", { name: /nastavi partiju/i })).toBeVisible();

  await playToFinish(page, gameId, seeded);
  await page.goto("/");
  await expect(page.getByRole("link", { name: /nastavi partiju/i })).toHaveCount(0);
  // Ista partija se odmah vidi u statistici (bez zastarjelog cachea).
  await expect(page.getByText(seeded.players[0].username).first()).toBeVisible();
});

test("polja za datum u filteru ne preklapaju se i iste su visine kao izbornici", async ({ page }) => {
  await registerAccount(page);
  await page.goto("/history");
  await page.getByRole("button", { name: /filteri/i }).click();
  const from = await page.getByLabel("Od datuma").boundingBox();
  const to = await page.getByLabel("Do datuma").boundingBox();
  const player = await page.getByLabel("Igrač").boundingBox();
  expect(from && to && player).toBeTruthy();
  expect(from!.x + from!.width).toBeLessThanOrEqual(to!.x);
  expect(Math.round(from!.width)).toBe(Math.round(player!.width));
  expect(Math.round(from!.height)).toBe(Math.round(player!.height));
  await page.screenshot({ path: test.info().outputPath("filters.png") });
});
