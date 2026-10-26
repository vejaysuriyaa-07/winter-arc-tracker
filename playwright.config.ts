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
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
