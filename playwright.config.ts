import { defineConfig } from "@playwright/test";

const BASE = "http://localhost:4173/winter-arc-tracker/";

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    baseURL: BASE,
    timezoneId: "America/Los_Angeles",
    trace: "retain-on-failure",
  },
  webServer: {
    // The test build points sync at a fake host that the tests answer themselves (e2e/fakeSupabase.ts),
    // so no test ever reaches a real Supabase project. These override any .env.local keys.
    command: "VITE_SHOWCASE=1 VITE_SUPABASE_URL=http://supabase.test VITE_SUPABASE_ANON_KEY=e2e-anon-key npm run build && npm run preview -- --port 4173 --strictPort",
    url: BASE,
    // Always a fresh build: a preview left running could have been built with real sync keys.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
