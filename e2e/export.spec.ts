import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createGame, playToFinish, registerAccount, seedGroup } from "./helpers";

test("CSV izvoz partija i ruku", async ({ page }) => {
  await registerAccount(page);
  const seeded = await seedGroup(page);
  const first = await createGame(page, seeded);
  await playToFinish(page, first, seeded);
  await createGame(page, seeded); // nezavršena

  await page.goto("/history");
  const gamesDownload = page.waitForEvent("download");
  await page.getByRole("link", { name: "Partije (.csv)" }).click();
  const games = await gamesDownload;
  expect(games.suggestedFilename()).toMatch(/^bela-partije-\d{4}-\d{2}-\d{2}\.csv$/);
  const gamesCsv = await readFile(await games.path(), "utf-8");
  const lines = gamesCsv.replace(/^﻿/, "").trim().split("\r\n");
  expect(lines[0]).toBe("id,datum,sezona,zavrsena,tim_a,tim_b,bodovi_a,bodovi_b,pobjednik,broj_ruku,komentar");
  expect(lines).toHaveLength(3);
  expect(lines[1]).toContain(",true,");
  expect(lines[2]).toContain(",false,");

  const roundsDownload = page.waitForEvent("download");
  await page.getByRole("link", { name: "Sve ruke (.csv)" }).click();
  const roundsCsv = await readFile(await (await roundsDownload).path(), "utf-8");
  const roundLines = roundsCsv.replace(/^﻿/, "").trim().split("\r\n");
  expect(roundLines[0].startsWith("partija_id,")).toBe(true);
  expect(roundLines.length).toBeGreaterThan(5);

  const unauth = await page.context().request.fetch("/api/export?type=games", {
    headers: { cookie: "" },
  });
  expect(unauth.status()).toBe(401);
});
