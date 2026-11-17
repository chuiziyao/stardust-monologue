/* Download Google-Fonts subsets covering exactly the glyphs used in index.html */
import fs from "node:fs";
import path from "node:path";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const set = new Set();
for (const ch of html) if (ch.codePointAt(0) > 0x7f) set.add(ch);
for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") set.add(ch);
const fullText = [...set].join("");
/* Cormorant only needs latin + the math glyphs used in equations */
const latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:·—–-+()=/&πΩψℏ∂Ĥ∑∫√∞≈≠≤≥±×÷∈∀∃∇⊗⊕∝αβγδεζημνξρστχ";
console.log("unique glyphs (full):", set.size);

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36";
const dir = new URL("../fonts/", import.meta.url);
fs.mkdirSync(dir, { recursive: true });
const outDir = dir.pathname.replace(/^\/([A-Za-z]:)/, "$1");

async function grab(family, axis, text, names) {
  const url = `https://fonts.googleapis.com/css2?family=${family}:${axis}&text=${encodeURIComponent(text)}&display=swap`;
  const css = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
  const urls = [...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]);
  if (urls.length !== names.length) throw new Error(`expected ${names.length} fonts, got ${urls.length}\n${css}`);
  for (let i = 0; i < urls.length; i++) {
    const buf = Buffer.from(await (await fetch(urls[i], { headers: { "User-Agent": UA } })).arrayBuffer());
    fs.writeFileSync(path.join(outDir, names[i]), buf);
    console.log("saved", names[i], buf.length, "bytes");
  }
}

await grab("Noto+Serif+SC", "wght@400;600;900", fullText,
  ["noto-serif-sc-400.woff2", "noto-serif-sc-600.woff2", "noto-serif-sc-900.woff2"]);
await grab("Cormorant+Garamond", "ital,wght@0,400;1,400;1,600", latin,
  ["cormorant-400.woff2", "cormorant-400i.woff2", "cormorant-600i.woff2"]);
console.log("done");
