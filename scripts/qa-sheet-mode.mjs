import { chromium } from "playwright-core";
import { executablePath } from "./browser-path.mjs";

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const posts = [];
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));

await page.route("https://script.google.com/**", async (route) => {
  posts.push(route.request().postData());
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true }),
  });
});
await page.route("https://script.googleusercontent.com/**", (route) => route.fulfill({ status: 200, body: "{}" }));

await page.goto("http://127.0.0.1:4321/dang-ky-lai-thu/", { waitUntil: "networkidle" });
await page.fill('form.lead-form-js input[name="fullName"]', "Sheet Mode Demo");
await page.fill('form.lead-form-js input[name="phone"]', "0900000000");
await page.selectOption('form.lead-form-js select[name="vehicleSlug"]', "vinfast-vf-3");
await page.fill('form.lead-form-js input[name="preferredDate"]', "2026-11-20");
await page.selectOption('form.lead-form-js select[name="preferredTime"]', "09:00");
await page.check('form.lead-form-js input[name="consent"]');
await page.click('form.lead-form-js button[type="submit"]');
await page.waitForTimeout(1000);

const status = await page.locator(".form-status").getAttribute("class");
const text = await page.locator(".form-status").textContent();
console.log(JSON.stringify({ posts, status, text: text?.trim(), errors }, null, 2));
await browser.close();
