import { chromium } from "playwright-core";
import { executablePath } from "./browser-path.mjs";

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:4321/", { waitUntil: "networkidle" });
const height = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < height; y += 700) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.waitForTimeout(60);
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
await page.screenshot({ path: "qa-desktop-top.png" });
await page.evaluate(() => window.scrollTo(0, 750));
await page.waitForTimeout(200);
await page.screenshot({ path: "qa-desktop-spotlight.png" });
await page.evaluate(() => window.scrollTo(0, 2200));
await page.waitForTimeout(200);
await page.screenshot({ path: "qa-desktop-service.png" });
await page.evaluate(() => window.scrollTo(0, 3300));
await page.waitForTimeout(200);
await page.screenshot({ path: "qa-desktop-news.png" });
console.log(JSON.stringify({ errors, height }, null, 2));
await browser.close();
