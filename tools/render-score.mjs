/* Render the full WebAudio score offline to soundtrack.wav (verification + bonus deliverable) */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import { CHROME, pageUrl } from "./lib.mjs";
const URL = pageUrl("render=1&capture=1");
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader",
    "--autoplay-policy=no-user-gesture-required"]
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", e => errors.push("PAGE: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
await page.goto(URL, { waitUntil: "networkidle0" });
await page.waitForFunction("window.__scoreReady === true", { timeout: 180000 });
const err = await page.evaluate(() => window.__scoreError);
if (err) { console.error("RENDER ERROR:", err); await browser.close(); process.exit(1); }
const stats = await page.evaluate(() => window.__scoreStats);
const len = await page.evaluate(() => window.__wavLen);
console.log("score stats:", stats, "wav bytes:", len);
const out = fs.createWriteStream("soundtrack.wav");
const CH = 6 * 1024 * 1024;
for (let off = 0; off < len; off += CH) {
  const b64 = await page.evaluate((s, l) => wavB64(s, l), off, Math.min(CH, len - off));
  out.write(Buffer.from(b64, "base64"));
}
await new Promise(r => out.end(r));
console.log("wrote soundtrack.wav");
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO ERRORS");
await browser.close();
