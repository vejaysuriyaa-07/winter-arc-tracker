// Frame timing of the garden in Chromium, as a stand-in until it can be
// measured on an iPhone. Runs on its own, never inside the test suite.
// Usage: VITE_SHOWCASE=1 npm run build && node scripts/perf-proxy.mjs
// It serves dist on port 4174, opens the dev showcase at 390x844 with 3x
// pixels and the CPU slowed 4x, and prints frame times for a busy scene.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const server = spawn("npx", ["vite", "preview", "--port", "4174", "--strictPort"], { cwd: root, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));

const browser = await chromium.launch();
const rows = [];
try {
  for (const look of ["journal", "night"]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    // Winter blizzard (snow and gusts), day 90 of 90, nine full-grown plants.
    await page.goto(`http://localhost:4174/winter-arc-tracker/#/dev/showcase?look=${look}&season=winter&mood=rough&day=90&done=9`);
    await page.getByTestId("showcase").waitFor();
    const frames = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const t = [];
          let last = performance.now();
          const tick = (now) => {
            t.push(now - last);
            last = now;
            if (t.length < 240) requestAnimationFrame(tick);
            else resolve(t);
          };
          requestAnimationFrame(tick);
        }),
    );
    frames.sort((a, b) => a - b);
    const q = (p) => frames[Math.floor(p * (frames.length - 1))].toFixed(1);
    rows.push({ look, median_ms: q(0.5), p95_ms: q(0.95), worst_ms: q(1) });
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.table(rows);
