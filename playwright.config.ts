import { defineConfig, devices } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.E2E_PORT ?? 3100);
// Svaki run dobije svoju, praznu lokalnu bazu — Supabase se nikad ne dira.
const dataDir =
  process.env.E2E_DATA_DIR ?? path.join(os.tmpdir(), `bela-e2e-${process.pid}-${Date.now()}`);

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "android", use: { ...devices["Pixel 7"] } },
    {
      // Safari engine: polja za datum i safe-area ponašaju se drukčije nego u Chromeu.
      name: "iphone",
      use: { ...devices["iPhone 15"] },
      testMatch: /home-and-filters\.spec\.ts$/,
    },
  ],
  webServer: {
    // Produkcijski build, jer SW i manifest rade samo tamo.
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/offline`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI && process.env.E2E_REUSE === "1",
    env: {
      // Prazne vrijednosti imaju prednost pred .env.local, pa se ide na FileRepo.
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      BELA_DATA_DIR: dataDir,
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-secret-e2e-secret-e2e-secret-e2e",
    },
  },
});
