import { chromium } from "playwright-core";
import { executablePath } from "./browser-path.mjs";

const base = "http://127.0.0.1:4322/demo";
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const failures = [];
page.on("response", (response) => {
  if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
});
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(`${base}/`, { waitUntil: "networkidle" });
const home = await page.evaluate(() => ({
  title: document.title,
  font: document.fonts.check('16px Mulish'),
  css: getComputedStyle(document.body).fontFamily,
  logo: document.querySelector(".logo img")?.getAttribute("src"),
  nav: Array.from(document.querySelectorAll(".main-nav a")).map((a) => a.getAttribute("href")),
  hero: document.querySelector(".hero-slide img")?.getAttribute("src"),
  noindex: document.querySelector('meta[name="robots"]')?.getAttribute("content"),
}));

await page.goto(`${base}/o-to-dien/vinfast-vf-3/`, { waitUntil: "networkidle" });
const detail = await page.evaluate(() => ({
  title: document.querySelector("h1")?.textContent,
  gallery: document.querySelector("[data-gallery-main]")?.getAttribute("src"),
  canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
  price: document.querySelector(".price-box .price")?.textContent,
}));

await page.goto(`${base}/dang-ky-lai-thu/`, { waitUntil: "networkidle" });
await page.fill('form.lead-form-js input[name="fullName"]', "Base Path Demo");
await page.fill('form.lead-form-js input[name="phone"]', "0900000000");
await page.selectOption('form.lead-form-js select[name="vehicleSlug"]', "vinfast-vf-3");
await page.fill('form.lead-form-js input[name="preferredDate"]', "2026-11-20");
await page.selectOption('form.lead-form-js select[name="preferredTime"]', "09:00");
await page.check('form.lead-form-js input[name="consent"]');
await page.click('form.lead-form-js button[type="submit"]');
await page.waitForTimeout(800);
const form = await page.evaluate(() => ({
  status: document.querySelector(".form-status")?.className,
  text: document.querySelector(".form-status")?.textContent?.trim(),
  leads: JSON.parse(localStorage.getItem("vf_demo_leads") || "[]").length,
}));

console.log(JSON.stringify({ home, detail, form, failures, errors }, null, 2));
await browser.close();
