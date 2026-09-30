import { expect, test } from "@playwright/test";
import { createGame, playToFinish, registerAccount, seedGroup } from "./helpers";

test("usporedba dva igrača pokazuje međusobni omjer", async ({ page }) => {
  await registerAccount(page);
  const seeded = await seedGroup(page);
  for (let i = 0; i < 2; i++) {
    await playToFinish(page, await createGame(page, seeded), seeded);
  }
  const [ana, bruno, cvita] = seeded.players;

  await page.goto("/leaderboard");
  await page.getByRole("link", { name: "Usporedi dva igrača" }).click();
  await page.getByLabel("Igrač A").selectOption(ana.username);
  await page.getByLabel("Igrač B").selectOption(cvita.username);
  await page.getByRole("button", { name: "Usporedi" }).click();

  await expect(page).toHaveURL(new RegExp(`a=${ana.username}&b=${cvita.username}`));
  // Tim A (Ana) je dobio obje partije protiv Cvite.
  await expect(page.getByText("jedan protiv drugoga")).toBeVisible();
  await expect(page.locator("p.font-mono", { hasText: /^2\s*:\s*0$/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Partija/ })).toBeVisible();

  await page.goto(`/usporedba?a=${ana.username}&b=${bruno.username}`);
  await expect(page.getByText("2 pobjeda u 2 partija (100%)")).toBeVisible();

  // Graf na profilu i sezona
  await page.goto(`/players/${ana.username}`);
  await expect(page.getByRole("img", { name: /Rejting kroz 2 partija/ })).toBeVisible();
  await page.goto("/sezona");
  await expect(page.getByText("Poredak sezone")).toBeVisible();
});
