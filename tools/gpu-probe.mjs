/* Probe hardware-GPU WebGL in headless Chrome: report renderer + timed frames. */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import { CHROME, pageUrl } from "./lib.mjs";
const q = process.argv[2] || "1.0";
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb",
    "--font-render-hinting=none", "--disable-lcd-text",
    "--enable-gpu", "--use-gl=angle", "--use-angle=d3d11", "--ignore-gpu-blocklist",
    "--enable-gpu-rasterization", "--window-size=1920,1080"]
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", e => errors.push("PAGE: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
await page.goto(pageUrl(`capture=1&q=${q}`), { waitUntil: "networkidle0" });
await page.waitForFunction("window.__ready === true", { timeout: 30000 });
const renderer = await page.evaluate(() => {
  const c = document.createElement("canvas"); const gl = c.getContext("webgl");
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  return { webgl: window.__meta.webgl, renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
});
console.log("renderer:", JSON.stringify(renderer));
fs.mkdirSync("samples", { recursive: true });
const N = 16, t0 = Date.now();
for (let i = 0; i < N; i++) {
  const t = (i + 0.5) * 300 / N;
  await page.evaluate(t => window.__seek(t), t);
  await page.screenshot({ path: `samples/gpu-${String(i).padStart(2, "0")}.jpg`, type: "jpeg", quality: 92 });
}
const ms = (Date.now() - t0) / N;
console.log(`avg ${ms.toFixed(0)} ms/frame  ->  full 7200 frames ≈ ${(ms * 7200 / 60000).toFixed(1)} min`);
console.log(errors.length ? "ERRORS:\n" + errors.slice(0, 8).join("\n") : "NO ERRORS");
await browser.close();
