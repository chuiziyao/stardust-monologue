/* Visual QA: per-scene stills via headless Chrome (SwiftShader WebGL) + gate shot.
   node tools/qa.mjs            -> sample stills into samples/
   node tools/qa.mjs gate       -> gate + a few live frames only */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import { CHROME, pageUrl } from "./lib.mjs";

const URL = pageUrl();
const SAMPLES = [
  ["gate", null],
  ["s0-title", 6], ["s0-cap", 14],
  ["s1-before", 23], ["s1-bang", 27], ["s1-expand", 38], ["s1-card", 44],
  ["s2-eq", 72], ["s2-late", 88],
  ["s3-star", 110], ["s3-late", 126],
  ["s4-helix", 150], ["s4-late", 164],
  ["s5-neural", 188], ["s5-late", 202],
  ["s6-tokens", 226], ["s6-late", 242],
  ["s7-candle", 264], ["s7-late", 278],
  ["s8-credits", 294],
  ["trans-1to2", 56], ["trans-3to4", 132]
];
const mode = process.argv[2] || "all";

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb",
    "--font-render-hinting=none", "--disable-lcd-text",
    "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--enable-webgl",
    "--ignore-gpu-blocklist", "--window-size=1920,1080"]
});
fs.mkdirSync("samples", { recursive: true });

/* capture-mode stills */
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", e => errors.push("PAGE: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
await page.goto(pageUrl("capture=1"), { waitUntil: "networkidle0" });
await page.waitForFunction("window.__ready === true", { timeout: 30000 });
console.log("webgl:", await page.evaluate(() => window.__meta.webgl));
await new Promise(r => setTimeout(r, 300));
for (const [name, t] of SAMPLES) {
  if (t === null) continue;
  if (mode === "gate") continue;
  await page.evaluate(t => window.__seek(t), t);
  await new Promise(r => setTimeout(r, 120));
  await page.screenshot({ path: `samples/${name}.png`, type: "png" });
  console.log("still", name, t);
}

/* live gate shot (no capture flag) */
const g = await browser.newPage();
await g.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
g.on("pageerror", e => errors.push("GATE PAGE: " + e.message));
await g.goto(URL, { waitUntil: "networkidle0" });
await g.waitForFunction("window.__ready === true", { timeout: 30000 });
await new Promise(r => setTimeout(r, 800));
await g.screenshot({ path: "samples/gate.png" });
console.log("still gate");

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO ERRORS");
await browser.close();
