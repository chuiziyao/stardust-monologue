/* Shared helpers for the QA / capture tools — keeps the repo portable.
   Set CHROME_PATH to override the browser binary. */
import fs from "node:fs";

export const ROOT = new URL("..", import.meta.url);

export function pageUrl(query = "") {
  const u = new URL("index.html", ROOT);
  if (query) u.search = query;
  return u.href;
}

function firstExisting(paths) { return paths.find(p => p && fs.existsSync(p)); }

export const CHROME = process.env.CHROME_PATH || firstExisting([
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA && process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium", "/usr/bin/chromium-browser"
]);

if (!CHROME) {
  console.error("No Chrome/Edge found. Set CHROME_PATH to your browser binary.");
  process.exit(1);
}
