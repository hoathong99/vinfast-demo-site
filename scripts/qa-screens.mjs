import { chromium } from "playwright-core";

const executablePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const base = "http://127.0.0.1:4321";

const browser = await chromium.launch({ executablePath, headless: true });

async function inspect(path, width, height, name) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const data = await page.evaluate(() => {
    const vw = window.innerWidth;
    const offenders = Array.from(document.querySelectorAll("*"))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          cls: String(el.className || "").slice(0, 70),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((item) => item.right > vw + 2 || item.left < -2)
      .slice(0, 30);
    return {
      width: vw,
      bodyScrollWidth: document.body.scrollWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      bodyHeight: document.body.scrollHeight,
      offenders,
    };
  });
  await page.screenshot({ path: name, fullPage: true });
  await page.close();
  return { path, width, data, errors };
}

const results = [];
results.push(await inspect("/", 390, 844, "qa-home-mobile.png"));
results.push(await inspect("/", 1440, 1000, "qa-home-desktop.png"));
results.push(await inspect("/o-to-dien/vinfast-vf-3/", 390, 844, "qa-detail-mobile.png"));
results.push(await inspect("/dang-ky-lai-thu/", 390, 844, "qa-form-mobile.png"));

console.log(JSON.stringify(results, null, 2));
await browser.close();
