import { expect, test, type Page } from "@playwright/test";
import { addRound, createGame, playToFinish, registerAccount, seedGroup, type Seeded } from "./helpers";

async function enterRound(page: Page, seeded: Seeded, opts: { callerIndex: number; pointsA: string; zvanje?: string }) {
  const caller = seeded.players[opts.callerIndex];
  const step1 = page.getByRole("group", { name: /tko je zvao/i });
  await step1.getByRole("button", { name: caller.username, exact: true }).click();
  await expect(step1.getByRole("button", { name: caller.username, exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "herc", exact: true }).click();

  const keypad = page.getByRole("group", { name: /tipkovnica/i });
  await keypad.getByRole("button", { name: "Očisti bodove" }).click();
  for (const digit of opts.pointsA) {
    await keypad.getByRole("button", { name: digit, exact: true }).click();
  }

  if (opts.zvanje) {
    await page.getByRole("button", { name: new RegExp(`^${caller.username}, zvanja`) }).click();
    await page.getByRole("button", { name: `+${opts.zvanje}`, exact: true }).click();
  }
}

test("partija od unosa ruke do ekrana pobjede", async ({ page }) => {
  await registerAccount(page);
  const seeded = await seedGroup(page);
  const gameId = await createGame(page, seeded);
  const [ana, , cvita] = seeded.players;

  // Ruka 1 kroz UI: Ana zove herc, 100 : 62 + zvanje 20 → prolazi.
  await page.goto(`/game/${gameId}`);
  await expect(page.getByRole("heading", { name: "Aktivna partija" })).toBeVisible();
  await page.getByRole("link", { name: /unesi novu ruku/i }).click();
  await expect(page.getByRole("navigation", { name: "Glavna navigacija" })).toHaveCount(0);
  await enterRound(page, seeded, { callerIndex: 0, pointsA: "100", zvanje: "20" });
  await expect(page.getByRole("button", { name: /: 62 bodova/ })).toBeVisible();
  await page.getByRole("button", { name: "Spremi ruku" }).click();
  await page.waitForURL(`**/game/${gameId}`);
  await expect(page.getByText("Ukupno: A 120 : 62 B")).toBeVisible();

  // Ruka 2 kroz UI: Cvita (Tim B) zove, A dobije 40 → B 122 prolazi.
  await page.getByRole("link", { name: /unesi novu ruku/i }).click();
  await enterRound(page, seeded, { callerIndex: 2, pointsA: "40" });
  await page.getByRole("button", { name: "Spremi ruku" }).click();
  await page.waitForURL(`**/game/${gameId}`);
  await expect(page.getByText("Ukupno: A 160 : 184 B")).toBeVisible();

  // Uređivanje ruke 2: Tim A sada 60 → 60 : 102.
  // Timeline je od najnovije ruke, pa je prvi "Uredi" ruka #2.
  await page.getByRole("link", { name: "Uredi" }).first().click();
  await page.waitForURL(/edit-round/);
  const keypad = page.getByRole("group", { name: /tipkovnica/i });
  await page.getByRole("button", { name: /Ana.*bodova/ }).click();
  await keypad.getByRole("button", { name: "Očisti bodove" }).click();
  await keypad.getByRole("button", { name: "6", exact: true }).click();
  await keypad.getByRole("button", { name: "0", exact: true }).click();
  await page.getByRole("button", { name: "Spremi izmjene" }).click();
  await page.waitForURL(`**/game/${gameId}`);
  await expect(page.getByText("Ukupno: A 180 : 164 B")).toBeVisible();

  // Ostatak partije preko API-ja, pa ekran pobjede.
  await playToFinish(page, gameId, seeded);
  await page.goto(`/game/${gameId}?pobjeda=1`);
  await expect(page.getByRole("heading", { name: "Završena partija" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pobjeda: Tim A" })).toBeVisible();
  // Promjena rejtinga je vidljiva odmah, bez čekanja na cache.
  await expect(page.getByText(/^\+\d+\.\d$/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Podijeli" })).toBeVisible();

  const image = await page.request.get(`/game/${gameId}/share-image`);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");

  await page.getByRole("link", { name: "Revanš" }).click();
  await page.waitForURL(/\/new-game\?rematch=/);
  await expect(page.getByText(ana.username).first()).toBeVisible();
  await expect(page.getByText(cvita.username).first()).toBeVisible();
});

test("dijeljenje bez Web Share API-ja preuzima sliku", async ({ page }) => {
  // Zamjena za preglednike bez Web Share (desktop/Android); iOS Safari ga ima,
  // a WebKit u Playwrightu ne podržava ovaj način preuzimanja.
  test.skip(test.info().project.name === "iphone", "iOS ima Web Share API");
  await registerAccount(page);
  const seeded = await seedGroup(page);
  const gameId = await createGame(page, seeded);
  await addRound(page, gameId, seeded, { pointsA: 120 });
  await playToFinish(page, gameId, seeded);

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
  });
  await page.goto(`/game/${gameId}`);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Podijeli" }).click();
  expect((await download).suggestedFilename()).toBe("bela-rezultat.png");
  await expect(page.getByRole("button", { name: "Slika preuzeta" })).toBeVisible();
});

test("koraci idu zvač → zvanja → bodovi, a štiglja je uz bodove", async ({ page }) => {
  await registerAccount(page);
  const seeded = await seedGroup(page);
  const gameId = await createGame(page, seeded);
  await page.goto(`/game/${gameId}/new-round`);

  const titles = await page.locator('[role="group"][aria-labelledby^="round-step-"]').evaluateAll((groups) =>
    groups.map((group) => document.getElementById(group.getAttribute("aria-labelledby")!)?.textContent),
  );
  expect(titles).toEqual(["Tko je zvao i koji znak", "Zvanja", "Bodovi iz čiste igre"]);

  const points = page.getByRole("group", { name: "Bodovi iz čiste igre" });
  const stiglia = points.getByRole("button", { name: /Štiglja \+90/ });
  await expect(stiglia).toHaveAttribute("aria-pressed", "false");
  // Aktivno polje je Tim B → štiglja za Tim B.
  await points.getByRole("button", { name: /Cvita.*bodova/ }).click();
  await stiglia.click();
  await expect(stiglia).toHaveAttribute("aria-pressed", "true");
  await expect(stiglia).toContainText("Tim B");
  await expect(points.getByRole("button", { name: /Cvita.*: 162 bodova/ })).toBeVisible();
  await expect(page.getByRole("group", { name: "Zvanja" }).getByRole("button", { name: /Štiglja/ })).toHaveCount(0);

  // Spremi je vidljiv bez skrolanja (ljepljiva traka).
  await expect(page.getByRole("button", { name: "Spremi ruku" })).toBeInViewport();
});
