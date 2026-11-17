/* Sustained real-time playback stability: continuous rAF + audio scheduler, voice cleanup,
   repeated play/pause/seek/replay must not duplicate loops/timers or leak voices. */
import puppeteer from "puppeteer-core";
import { CHROME, pageUrl } from "./lib.mjs";
const URL = pageUrl();
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb",
    "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--enable-webgl",
    "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"]
});
const errors = [];
const page = await browser.newPage();
page.on("pageerror", e => errors.push("PAGE: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
await page.setViewport({ width: 1280, height: 720 });
await page.goto(URL, { waitUntil: "networkidle0" });
await page.waitForFunction("window.__ready === true", { timeout: 30000 });
await page.click("#startBtn");
const snap = () => page.evaluate(() => ({
  t: +window.state.t.toFixed(1), playing: window.state.playing,
  voices: window.AudioEngine.voices.size, nextEv: window.AudioEngine.nextEv,
  ctx: window.AudioEngine.ctx.state, gl: window.__meta.webgl
}));
let maxVoices = 0;
for (let i = 0; i < 8; i++) {
  await new Promise(r => setTimeout(r, 2000));
  const s = await snap(); maxVoices = Math.max(maxVoices, s.voices);
  console.log(`t+${(i + 1) * 2}s`, JSON.stringify(s));
}
await page.screenshot({ path: "samples/stability-play.png" });
/* rapid play/pause/seek stress */
for (let i = 0; i < 6; i++) {
  await page.keyboard.press("Space");
  await page.evaluate(t => window.seek(t), 20 + i * 40);
  await page.keyboard.press("Space");
}
await new Promise(r => setTimeout(r, 1500));
const after = await snap();
console.log("after stress:", JSON.stringify(after), "maxVoices:", maxVoices);
/* replay from end repeatedly */
for (let i = 0; i < 3; i++) { await page.evaluate(() => { window.seek(299.5); window.play(); }); await new Promise(r => setTimeout(r, 700)); await page.click("#againBtn"); }
await new Promise(r => setTimeout(r, 800));
console.log("after replays:", JSON.stringify(await snap()));
console.log("voices bounded (<=120):", maxVoices <= 120);
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO ERRORS");
await browser.close();
