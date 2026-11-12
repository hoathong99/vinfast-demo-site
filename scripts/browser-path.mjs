import { existsSync } from "node:fs";

/*
 * Resolve a Chromium-based browser for playwright-core.
 * Override with CHROME_PATH when the browser lives somewhere unusual.
 */
const candidates = [
  process.env.CHROME_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

export const executablePath = candidates.find((path) => path && existsSync(path));

if (!executablePath) {
  throw new Error("No Chromium-based browser found. Set CHROME_PATH to chrome.exe or msedge.exe.");
}
