/* Deterministic frame capture of the film via headless Chrome (SwiftShader WebGL).
   node tools/capture.mjs probe [q]   -> 24 timed frames, estimate full-run cost
   node tools/capture.mjs full  [q]   -> 7200 frames (24fps x 300s) into frames/   */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import { CHROME, pageUrl } from "./lib.mjs";

const FPS = 24, DUR = 300;
const mode = process.argv[2] || "probe";
const GPU = process.argv.includes("gpu");
const q = (process.argv[3] && process.argv[3] !== "gpu") ? process.argv[3] : (GPU ? "1.0" : "0.8");
const URL = pageUrl(`capture=1&q=${q}`);

const GPU_ARGS = ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb",
  "--font-render-hinting=none", "--disable-lcd-text",
  "--enable-gpu", "--use-gl=angle", "--use-angle=d3d11", "--ignore-gpu-blocklist",
  "--enable-gpu-rasterization", "--window-size=1920,1080"];
const SW_ARGS = ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb",
  "--font-render-hinting=none", "--disable-lcd-text",
  "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--enable-webgl",
  "--ignore-gpu-blocklist", "--window-size=1920,1080"];
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, args: GPU ? GPU_ARGS : SW_ARGS
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", e => errors.push("PAGE: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
await page.goto(URL, { waitUntil: "networkidle0" });
await page.waitForFunction("window.__ready === true", { timeout: 30000 });
console.log("webgl:", await page.evaluate(() => window.__meta.webgl), "quality:", q);
await new Promise(r => setTimeout(r, 300));

async function shot(t, path) {
  await page.evaluate(t => window.__seek(t), t);
  await page.screenshot({ path, type: "jpeg", quality: 92 });
}

if (mode === "probe") {
  fs.mkdirSync("samples", { recursive: true });
  const N = 24, t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) * DUR / N;
    await shot(t, `samples/probe-${String(i).padStart(2, "0")}.jpg`);
  }
  const ms = (Date.now() - t0) / N;
  console.log(`avg ${ms.toFixed(0)} ms/frame  ->  full ${DUR * FPS} frames ≈ ${(ms * DUR * FPS / 60000).toFixed(1)} min`);
} else {
  fs.mkdirSync("frames", { recursive: true });
  const total = DUR * FPS, t0 = Date.now();
  for (let i = 0; i < total; i++) {
    await shot(i / FPS, `frames/f${String(i).padStart(5, "0")}.jpg`);
    if (i % 240 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`frame ${i}/${total}  t=${(i / FPS).toFixed(1)}s  elapsed=${el | 0}s  eta=${(el / Math.max(i, 1) * (total - i)) | 0}s`);
    }
  }
  console.log(`DONE ${total} frames in ${((Date.now() - t0) / 1000) | 0}s`);
}
console.log(errors.length ? "ERRORS:\n" + errors.slice(0, 10).join("\n") : "NO ERRORS");
await browser.close();
