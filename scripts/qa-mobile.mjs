import { chromium } from "playwright-core";
import { executablePath } from "./browser-path.mjs";

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:4321/", { waitUntil: "networkidle" });

// Force lazy images to load by scrolling through the page.
const height = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < height; y += 600) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.waitForTimeout(80);
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

const imageState = await page.evaluate(() =>
  Array.from(document.querySelectorAll("img")).map((img) => ({
    src: img.getAttribute("src"),
    loaded: img.complete && img.naturalWidth > 0,
    w: img.naturalWidth,
    h: img.naturalHeight,
  })),
);

await page.screenshot({ path: "qa-mobile-top.png" });
await page.evaluate(() => window.scrollTo(0, 700));
await page.waitForTimeout(200);
await page.screenshot({ path: "qa-mobile-spotlight.png" });
await page.evaluate(() => window.scrollTo(0, 2400));
await page.waitForTimeout(200);
await page.screenshot({ path: "qa-mobile-news.png" });
await page.evaluate(() => window.scrollTo(0, 3800));
await page.waitForTimeout(200);
await page.screenshot({ path: "qa-mobile-form.png" });

console.log(JSON.stringify({ errors, imageState }, null, 2));
await browser.close();
