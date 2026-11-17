/* Interaction + audio + mobile QA */
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
await page.setViewport({ width: 1440, height: 900 });
await page.goto(URL, { waitUntil: "networkidle0" });
await page.waitForFunction("window.__ready === true", { timeout: 30000 });
await new Promise(r => setTimeout(r, 500));
await page.screenshot({ path: "samples/live-gate.png" });
console.log("gate HUD hidden:", await page.evaluate(() => getComputedStyle(document.getElementById("hud")).opacity === "0"));

const T = () => page.evaluate(() => window.state.t);
const P = () => page.evaluate(() => window.state.playing);

await page.click("#startBtn");
await new Promise(r => setTimeout(r, 2200));
console.log("after start: playing=", await P(), "t=", (await T()).toFixed(2));
console.log("audio:", await page.evaluate(() => ({
  state: window.AudioEngine.ctx?.state,
  voices: window.AudioEngine.voices.size,
  nextEv: window.AudioEngine.nextEv,
  events: window.AudioEngine.events.length,
  master: window.AudioEngine.master?.gain.value.toFixed(2)
})));
await page.mouse.move(700, 400);
await page.screenshot({ path: "samples/live-playing.png" });

await page.keyboard.press("Space");
console.log("after space: playing=", await P());
await page.keyboard.press("Space");
console.log("after space2: playing=", await P());

await page.click("#chapBtn");
await new Promise(r => setTimeout(r, 350));
await page.screenshot({ path: "samples/live-chapters.png" });
await page.evaluate(() => document.querySelectorAll(".chap")[5].click());
await new Promise(r => setTimeout(r, 500));
console.log("after chapter 6: t=", (await T()).toFixed(2), "playing=", await P());
await page.mouse.move(720, 450);
await page.screenshot({ path: "samples/live-mind.png" });

/* scrub to ~80% */
const box = await page.evaluate(() => { const r = document.getElementById("scrub").getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
await page.mouse.move(box.x + box.w * .5, box.y + box.h / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.w * .8, box.y + box.h / 2, { steps: 8 });
await page.mouse.up();
console.log("after scrub 80%: t=", (await T()).toFixed(2));

await page.click("#muteBtn");
console.log("muted=", await page.evaluate(() => window.AudioEngine.muted));
await page.click("#muteBtn");
console.log("unmuted=", await page.evaluate(() => !window.AudioEngine.muted));

/* run to the end */
await page.evaluate(() => { window.seek(299.2); window.play(); });
await new Promise(r => setTimeout(r, 1600));
console.log("end overlay shown=", await page.evaluate(() => document.getElementById("endOverlay").classList.contains("show")), "playing=", await P());
await page.screenshot({ path: "samples/live-end.png" });
await page.click("#againBtn");
await new Promise(r => setTimeout(r, 600));
console.log("after replay: t=", (await T()).toFixed(2), "playing=", await P());

/* mobile */
const m = await browser.newPage();
m.on("pageerror", e => errors.push("MOBILE PAGE: " + e.message));
await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await m.goto(URL, { waitUntil: "networkidle0" });
await m.waitForFunction("window.__ready === true", { timeout: 30000 });
await new Promise(r => setTimeout(r, 500));
await m.screenshot({ path: "samples/live-mobile-gate.png" });
await m.tap("#startBtn");
await new Promise(r => setTimeout(r, 1500));
await m.touchscreen.tap(200, 300);
await new Promise(r => setTimeout(r, 300));
await m.screenshot({ path: "samples/live-mobile.png" });
console.log("mobile playing=", await m.evaluate(() => window.state.playing));

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO ERRORS");
await browser.close();
