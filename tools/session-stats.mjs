/* Sum model-call usage from the current DSH session log (zstd-compressed JSONL). */
import fs from "node:fs";
import path from "node:path";
import { decompress } from "fzstd";

const base = process.argv[2] || "C:\\Users\\chuiz\\.dsh\\sessions\\--D-0000DSH-qwen4-yihan--";
const dirs = fs.readdirSync(base).map(d => path.join(base, d))
  .filter(d => fs.statSync(d).isDirectory());
let file = null, best = 0;
for (const d of dirs) {
  const f = path.join(d, "session.v4.jsonl.zstd");
  if (fs.existsSync(f)) { const m = fs.statSync(f).mtimeMs; if (m > best) { best = m; file = f; } }
}
if (!file) { console.error("no session log"); process.exit(1); }
const raw = decompress(fs.readFileSync(file));
const text = new TextDecoder().decode(raw);
const tot = {}; let n = 0;
for (const line of text.split("\n")) {
  if (!line.trim()) continue;
  let r; try { r = JSON.parse(line); } catch { continue; }
  if (r.type !== "assistant/message") continue;
  const d = r.data || {};
  let u = d.usage;
  if (!u && Array.isArray(d.stream)) {
    const chunks = d.stream.map(c => c?.chunk?.usage).filter(Boolean);
    u = chunks[chunks.length - 1];
  }
  if (!u) continue;
  n++;
  for (const [k, v] of Object.entries(u)) if (typeof v === "number") tot[k] = (tot[k] || 0) + v;
}
const i = tot.inputTokens || 0, o = tot.outputTokens || 0, c = tot.cacheReadTokens || 0;
console.log("session:", path.basename(path.dirname(file)));
console.log("model calls:", n);
for (const k of Object.keys(tot).sort()) console.log(`${k}: ${tot[k].toLocaleString()}`);
console.log(`input+output+cacheRead: ${(i + o + c).toLocaleString()}`);
fs.writeFileSync("tools/usage.json", JSON.stringify({ calls: n, ...Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, Math.round(v)])) }, null, 2));
