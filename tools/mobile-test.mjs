/* Focused mobile QA: portrait + landscape, control visibility & reachability */
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
async function check(w, h, name, mobile) {
  const p = await browser.newPage();
  p.on("pageerror", e => errors.push(name + " PAGE: " + e.message));
  p.on("console", m => { if (m.type() === "error") errors.push(name + " CONSOLE: " + m.text()); });
  await p.setViewport({ width: w, height: h, isMobile: false, hasTouch: true, deviceScaleFactor: 1 });
  await p.goto(URL, { waitUntil: "networkidle0" });
  await p.waitForFunction("window.__ready === true", { timeout: 30000 });
  await new Promise(r => setTimeout(r, 400));
  await p.screenshot({ path: `samples/m-${name}-gate.png` });
  await p.evaluate(() => document.getElementById("startBtn").click());
  await new Promise(r => setTimeout(r, 1200));
  await p.evaluate(() => { document.getElementById("hud").classList.remove("idle"); });
  await new Promise(r => setTimeout(r, 150));
  const info = await p.evaluate(() => {
    const r = id => { const e = document.getElementById(id); const b = e.getBoundingClientRect();
      const cs = getComputedStyle(e); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), disp: cs.display, vis: cs.visibility }; };
    return { mute: r("muteBtn"), play: r("playBtn"), fs: r("fsBtn"), chap: r("chapBtn"),
      vw: innerWidth, vh: innerHeight, playing: window.state.playing };
  });
  const inView = b => b.w > 0 && b.disp !== "none" && b.x >= 0 && b.y >= 0 && b.x + b.w <= info.vw + 1 && b.y + b.h <= info.vh + 1;
  console.log(name, JSON.stringify(info));
  console.log(name, "mute visible:", inView(info.mute), "play visible:", inView(info.play), "fs visible:", inView(info.fs));
  /* tap mute to confirm it toggles on touch */
  await p.evaluate(() => document.getElementById("muteBtn").click());
  console.log(name, "muted after tap:", await p.evaluate(() => window.AudioEngine.muted));
  await p.screenshot({ path: `samples/m-${name}-play.png` });
  await p.close();
}
await check(390, 844, "portrait", true);
await check(844, 390, "landscape", true);
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO ERRORS");
await browser.close();
