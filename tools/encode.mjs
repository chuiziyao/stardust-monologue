/* Encode captured frames + soundtrack into the final film (GPU AMF, CPU fallback), then verify.
   node tools/encode.mjs [amf|x264] */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const FPS = 24, DUR = 300, TOTAL = FPS * DUR;
const OUT = "星尘独白.mp4";
const want = process.argv[2] || "amf";
const frames = fs.readdirSync("frames").filter(f => /^f\d{5}\.jpg$/.test(f));
console.log("frames present:", frames.length, "/", TOTAL);
if (frames.length < TOTAL) { console.error("incomplete frames; run capture first"); process.exit(1); }

function args(enc) {
  const v = enc === "amf"
    ? ["-c:v", "h264_amf", "-usage", "transcoding", "-quality", "quality", "-rc", "vbr_peak", "-b:v", "10M", "-maxrate", "16M", "-bufsize", "20M", "-pix_fmt", "yuv420p"]
    : ["-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.1"];
  return ["-y", "-framerate", String(FPS), "-i", "frames/f%05d.jpg", "-i", "soundtrack.wav",
    ...v, "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-shortest", "-movflags", "+faststart", OUT];
}
function run(enc) {
  console.log(`encoding with ${enc}…`);
  const t0 = Date.now();
  const r = spawnSync("ffmpeg", args(enc), { stdio: ["ignore", "inherit", "inherit"] });
  console.log(`${enc} exited ${r.status} in ${((Date.now() - t0) / 1000) | 0}s`);
  return r.status === 0;
}
let ok = run(want);
if (!ok && want === "amf") { console.log("AMF failed; falling back to libx264"); ok = run("x264"); }
if (!ok) { console.error("encode failed"); process.exit(1); }

const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries",
  "format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels",
  "-of", "json", OUT], { encoding: "utf8" });
console.log(probe.stdout);
fs.mkdirSync("samples", { recursive: true });
for (const t of [30, 150, 270]) {
  spawnSync("ffmpeg", ["-y", "-ss", String(t), "-i", OUT, "-frames:v", "1", "-q:v", "2", `samples/verify-${t}.jpg`], { stdio: "ignore" });
}
console.log("wrote", OUT, fs.statSync(OUT).size, "bytes; verification frames in samples/");
