import { chromium } from "playwright-core";
import { executablePath } from "./browser-path.mjs";

const base = "http://127.0.0.1:4321";
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));

async function submitService() {
  await page.goto(`${base}/dat-lich-dich-vu/`, { waitUntil: "networkidle" });
  await page.fill('form.lead-form-js input[name="fullName"]', "Dịch Vụ Demo");
  await page.fill('form.lead-form-js input[name="phone"]', "0900000000");
  await page.selectOption('form.lead-form-js select[name="vehicleSlug"]', "vinfast-vf-8");
  await page.fill('form.lead-form-js input[name="preferredDate"]', "2026-11-20");
  await page.selectOption('form.lead-form-js select[name="preferredTime"]', "10:00");
  await page.check('form.lead-form-js input[name="serviceType"][value="Bảo dưỡng"]');
  await page.fill('form.lead-form-js input[name="licensePlate"]', "30A-12345");
  await page.fill('form.lead-form-js input[name="km"]', "12000");
  await page.fill('form.lead-form-js textarea[name="message"]', "Kiểm tra tổng quát");
  await page.check('form.lead-form-js input[name="consent"]');
  await page.click('form.lead-form-js button[type="submit"]');
  await page.waitForTimeout(800);
  return page.evaluate(() => {
    const status = document.querySelector(".form-status");
    const leads = JSON.parse(localStorage.getItem("vf_demo_leads") || "[]");
    return { status: status?.className, text: status?.textContent?.trim(), last: leads[leads.length - 1] };
  });
}

async function submitContact() {
  await page.goto(`${base}/lien-he/`, { waitUntil: "networkidle" });
  await page.fill('form.lead-form-js input[name="fullName"]', "Liên Hệ Demo");
  await page.fill('form.lead-form-js input[name="phone"]', "0900000000");
  await page.fill('form.lead-form-js input[name="email"]', "demo@example.com");
  await page.fill('form.lead-form-js textarea[name="message"]', "Cần tư vấn");
  await page.check('form.lead-form-js input[name="consent"]');
  await page.click('form.lead-form-js button[type="submit"]');
  await page.waitForTimeout(800);
  return page.evaluate(() => {
    const status = document.querySelector(".form-status");
    const leads = JSON.parse(localStorage.getItem("vf_demo_leads") || "[]");
    return { status: status?.className, text: status?.textContent?.trim(), last: leads[leads.length - 1] };
  });
}

const service = await submitService();
const contact = await submitContact();
console.log(JSON.stringify({ service, contact, errors }, null, 2));
await browser.close();
