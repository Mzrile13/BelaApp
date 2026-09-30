import { expect, test } from "@playwright/test";
import { registerAccount } from "./helpers";

test("PWA datoteke su dostupne bez prijave", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  const body = await manifest.json();
  expect(body).toMatchObject({ display: "standalone", start_url: "/" });
  expect(body.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(true);

  const sw = await request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(sw.headers()["cache-control"]).toContain("no-store");

  const offline = await request.get("/offline", { maxRedirects: 0 });
  expect(offline.status()).toBe(200);

  const home = await request.get("/", { maxRedirects: 0 });
  expect(home.status()).toBe(307);
});

test("donja navigacija vodi na glavne ekrane", async ({ page }) => {
  await registerAccount(page);
  const nav = page.getByRole("navigation", { name: "Glavna navigacija" });
  await expect(nav.getByRole("link", { name: "Početna" })).toHaveAttribute("aria-current", "page");

  for (const [label, path, heading] of [
    ["Ljestvica", "/leaderboard", "Leaderboard"],
    ["Sezona", "/sezona", /^Sezona \d{2}\/\d{2}$/],
    ["Povijest", "/history", "Povijest partija"],
  ] as const) {
    await nav.getByRole("link", { name: label }).click();
    await page.waitForURL(`**${path}`);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
  }

  await page.context().clearCookies();
  await page.goto("/login");
  await expect(page.getByRole("navigation", { name: "Glavna navigacija" })).toHaveCount(0);
});

test("service worker se registrira", async ({ page }) => {
  await registerAccount(page);
  await page.goto("/");
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toMatch(/\/$/);
});
