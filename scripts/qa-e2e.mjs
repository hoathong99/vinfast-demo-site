import { chromium } from "playwright-core";
import { executablePath } from "./browser-path.mjs";

const base = "http://127.0.0.1:4321";
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));

const results = {};

// Home: mobile nav is always visible in the header (no drawer needed)
await page.goto(`${base}/`, { waitUntil: "networkidle" });
results.mobileNav = {
  visible: await page.locator(".main-nav").isVisible(),
  items: await page.locator(".main-nav .nav-link").count(),
  drawerButtons: await page.locator("[data-drawer-open]").count(),
  headerPosition: await page.locator(".site-header").evaluate((el) => getComputedStyle(el).position),
};

// Home: hero carousel next
const heroTrack = page.locator(".hero-track");
const before = await heroTrack.evaluate((el) => el.scrollLeft);
await page.click(".hero [data-carousel-next]");
await page.waitForTimeout(700);
const after = await heroTrack.evaluate((el) => el.scrollLeft);
results.heroAdvanced = after > before;

// Listing filters: vehicle type + price range
await page.goto(`${base}/o-to-dien/`, { waitUntil: "networkidle" });
const initialCards = await page.locator("[data-vehicle-card]:visible").count();
await page.click('[data-filter-type="mini-suv"]');
const typeFiltered = await page.locator("[data-vehicle-card]:visible").count();
await page.click('[data-filter-type=""]');
const typeReset = await page.locator("[data-vehicle-card]:visible").count();
await page.evaluate(() => {
  const input = document.querySelector("[data-price-max-input]");
  input.value = "500000000";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
const priceFiltered = await page.locator("[data-vehicle-card]:visible").count();
const priceReadout = (await page.locator("[data-price-readout]").textContent())?.trim();
await page.click("[data-filter-reset]");
const resetCards = await page.locator("[data-vehicle-card]:visible").count();
results.filter = { initialCards, typeFiltered, typeReset, priceFiltered, priceReadout, resetCards };

// Detail gallery + calculator
await page.goto(`${base}/o-to-dien/vinfast-vf-3/`, { waitUntil: "networkidle" });
const mainBefore = await page.locator("[data-gallery-main]").getAttribute("src");
await page.locator("[data-gallery-thumb]").nth(2).click();
const mainAfter = await page.locator("[data-gallery-main]").getAttribute("src");
results.galleryChanged = mainBefore !== mainAfter;

const monthlyBefore = await page.locator("[data-calc-monthly]").textContent();
await page.locator("[data-calc-down]").evaluate((el) => { el.value = "50"; el.dispatchEvent(new Event("input", { bubbles: true })); });
const monthlyAfter = await page.locator("[data-calc-monthly]").textContent();
results.calculatorChanged = monthlyBefore !== monthlyAfter;

// Detail content sections, product gallery, comparison table and catalog
const detailSections = await page
  .locator("#thong-tin-san-pham, #thiet-ke, #thiet-ke-noi-that, #van-hanh, #an-toan, #so-sanh, #thong-so-ky-thuat")
  .count();
const productBefore = await page.locator(".product-slide.is-active img").getAttribute("src");
await page.locator(".product-arrow--next").click();
await page.waitForTimeout(700);
const productAfter = await page.locator(".product-slide.is-active img").getAttribute("src");
const compareBefore = await page.locator("[data-compare-value='Quãng đường']").textContent();
await page.selectOption("[data-compare-select]", { index: 1 });
await page.waitForTimeout(200);
const compareAfter = await page.locator("[data-compare-value='Quãng đường']").textContent();
const catalogHref = await page.locator("#thong-so-ky-thuat a[href$='.pdf']").getAttribute("href");
const catalogStatus = catalogHref ? (await page.request.get(`${base}${catalogHref}`)).status() : null;
results.detail = {
  detailSections,
  galleryChanged: productBefore !== productAfter,
  compareBefore: compareBefore?.trim(),
  compareAfter: compareAfter?.trim(),
  compareChanged: compareBefore !== compareAfter,
  catalogHref,
  catalogStatus,
};

// Test drive form: validation then success (demo mode)
await page.goto(`${base}/dang-ky-lai-thu/?model=vinfast-vf-5`, { waitUntil: "networkidle" });
await page.click('form.lead-form-js button[type="submit"]');
const validationErrors = await page.locator("form.lead-form-js .is-invalid").count();
results.formValidationErrors = validationErrors;

await page.fill('form.lead-form-js input[name="fullName"]', "Nguyễn Demo");
await page.fill('form.lead-form-js input[name="phone"]', "0900000000");
const selectedVehicle = await page.locator('form.lead-form-js select[name="vehicleSlug"]').inputValue();
await page.fill('form.lead-form-js input[name="preferredDate"]', "2026-11-20");
await page.selectOption('form.lead-form-js select[name="preferredTime"]', "09:00");
await page.check('form.lead-form-js input[name="consent"]');
await page.click('form.lead-form-js button[type="submit"]');
await page.waitForTimeout(900);
const statusClass = await page.locator("form.lead-form-js .form-status").getAttribute("class");
const statusText = await page.locator("form.lead-form-js .form-status").textContent();
const leads = await page.evaluate(() => JSON.parse(localStorage.getItem("vf_demo_leads") || "[]"));
const events = await page.evaluate(() => JSON.parse(localStorage.getItem("vf_demo_events") || "[]"));
results.form = {
  selectedVehicle,
  statusClass,
  statusText: statusText?.trim(),
  savedLeads: leads.length,
  lastLead: leads[leads.length - 1],
  eventNames: events.map((item) => item.event),
};

// Contact map facade
await page.goto(`${base}/lien-he/`, { waitUntil: "networkidle" });
await page.click("[data-map-load]");
results.mapIframe = await page.locator(".map-facade iframe").count();

// Zalo link
results.zaloHref = await page.locator(".zalo-bubble").getAttribute("href");

console.log(JSON.stringify({ results, errors }, null, 2));
await browser.close();
