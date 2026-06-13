import { defineConfig, devices } from "@playwright/test";

// Dedicated e2e port — distinct from the default dev port (4321) so a developer
// running `pnpm dev` locally does not collide with the e2e webServer, and from
// the mission's off-limits ports (8787/8788). CI has nothing else bound here.
const PORT = Number(process.env.E2E_PORT ?? 4399);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // RSVP specs mutate shared capacity state in data.db; run serially so reseed
  // (in the webServer command) gives every run a deterministic baseline and
  // parallel workers never race the same event's capacity.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    headless: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Reseed the database, then boot the real EmDash dev server (workerd sandbox
  // runner) so CI needs no manual orchestration. The site does not hardcode a
  // port — astro binds the one we pass and the specs use baseURL.
  webServer: {
    command: `node scripts/seed.mjs && astro dev --host 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
});
