import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const base = "http://127.0.0.1:4321";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const pages = [
  "/",
  "/o-to-dien/",
  "/o-to-dien/vinfast-vf-3/",
  "/o-to-dien/vinfast-vf-5/",
  "/o-to-dien/vinfast-vf-8/",
  "/o-to-dien/vinfast-vf-9/",
  "/xe-may-dien/",
  "/xe-may-dien/vinfast-evo/",
  "/xe-may-dien/vinfast-viper/",
  "/dang-ky-lai-thu/",
  "/dat-lich-dich-vu/",
  "/lien-he/",
  "/tin-tuc/",
  "/tin-tuc/uu-dai-lai-thu-vf-3-demo/",
  "/tin-tuc/dich-vu-5-sao-demo/",
  "/tin-tuc/kinh-nghiem-cham-soc-pin-demo/",
  "/chinh-sach/bao-mat/",
];

const badLinks = new Set();
const checked = new Set();

for (const path of pages) {
  const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  if (!response || response.status() !== 200) {
    badLinks.add(`${path} (page ${response?.status()})`);
    continue;
  }
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href], img[src], script[src], link[href]"))
      .map((el) => el.getAttribute("href") || el.getAttribute("src"))
      .filter(Boolean),
  );
  for (const raw of links) {
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("https://zalo.me") || raw.startsWith("https://www.google.com/maps") || raw.startsWith("https://maps.google.com")) continue;
    if (raw.startsWith("http://") || raw.startsWith("https://")) continue;
    const url = new URL(raw, `${base}${path}`).href;
    if (checked.has(url)) continue;
    checked.add(url);
    const res = await page.request.get(url);
    if (!res.ok()) badLinks.add(`${path} -> ${raw} (${res.status()})`);
  }
}

// Static scan for old domain references and noindex.
const dist = "dist";
const textFiles = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(html|js|css|txt|xml|json)$/.test(name)) textFiles.push(full);
  }
}
walk(dist);
const oldRefs = [];
const missingNoindex = [];
for (const file of textFiles) {
  const content = readFileSync(file, "utf8");
  if (content.includes("vinfastcaron.vn")) oldRefs.push(file);
  if (file.endsWith(".html") && !content.includes('name="robots"')) missingNoindex.push(file);
}

console.log(JSON.stringify({ badLinks: [...badLinks], oldRefs, missingNoindex, checked: checked.size }, null, 2));
await browser.close();
