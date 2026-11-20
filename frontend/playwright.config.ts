import { defineConfig } from "@playwright/test";

// Needs backend (DEMO_MODE=true, SEED_DEMO=true) on :8000 and frontend on :3000.
// Run `npm run dev` + backend first, or set E2E_BASE_URL.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", locale: "th-TH" },
});
