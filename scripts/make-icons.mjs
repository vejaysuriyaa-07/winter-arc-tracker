// Renders public/icons/icon.svg to the PNG sizes the manifest needs, using the
// Chromium that Playwright already ships. Run: node scripts/make-icons.mjs
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const svg = await readFile(path.join(root, "public/icons/icon.svg"), "utf8");
const out = (name) => path.join(root, "public/icons", name);

const jobs = [
  { file: "icon-192.png", size: 192, pad: 0 },
  { file: "icon-512.png", size: 512, pad: 0 },
  { file: "icon-512-maskable.png", size: 512, pad: 0.1 },
  { file: "apple-touch-icon.png", size: 180, pad: 0 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const { file, size, pad } of jobs) {
  const inner = Math.round(size * (1 - 2 * pad));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:#0A0F0D;display:grid;place-items:center;width:${size}px;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace("<svg ", '<svg width="100%" height="100%" ')}</div></body></html>`,
  );
  await page.screenshot({ path: out(file), clip: { x: 0, y: 0, width: size, height: size }, omitBackground: false });
  console.log("wrote", file);
}
await browser.close();
