import { expect, test } from "@playwright/test";
import { registerAccount } from "./helpers";

test("promjena lozinke odjavljuje ostale uređaje, a ovaj ostaje prijavljen", async ({ page, browser, baseURL }) => {
  const { username, password } = await registerAccount(page);

  // Drugi "uređaj" s istim računom.
  const other = await browser.newContext({ baseURL });
  const login = await other.request.post("/api/login", { data: { username, password } });
  expect(login.ok()).toBeTruthy();
  expect((await other.request.get("/api/games")).status()).toBe(200);

  const change = await page.request.post("/api/account/password", {
    data: { currentPassword: password, newPassword: "nova-lozinka-123", confirmPassword: "nova-lozinka-123" },
  });
  expect(change.ok()).toBeTruthy();

  expect((await page.request.get("/api/games")).status()).toBe(200);
  expect((await other.request.get("/api/games")).status()).toBe(401);

  // Poništen cookie i dalje prolazi potpis u proxyju; stranica mora završiti na
  // prijavi, a ne vrtjeti krug /login ↔ /.
  const otherPage = await other.newPage();
  await otherPage.goto("/history");
  await expect(otherPage).toHaveURL(/\/login/);
  await expect(otherPage.getByRole("button", { name: /prijav/i })).toBeVisible();
  await other.close();
});

test("API izmjene s tuđeg origina se odbijaju", async ({ page }) => {
  await registerAccount(page);
  const crossSite = await page.request.post("/api/groups", {
    data: { name: "Napad" },
    headers: { "sec-fetch-site": "cross-site", origin: "https://evil.example" },
  });
  expect(crossSite.status()).toBe(403);

  const login = await page.request.post("/api/login", {
    data: { username: "x", password: "y" },
    headers: { origin: "https://evil.example" },
  });
  expect(login.status()).toBe(403);

  const sameOrigin = await page.request.post("/api/groups", { data: { name: "Ekipa" } });
  expect(sameOrigin.status()).toBe(201);
});
