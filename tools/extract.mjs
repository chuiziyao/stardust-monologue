import fs from "node:fs";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
fs.writeFileSync(new URL("./_extract.js", import.meta.url), m[1], "utf8");
console.log("extracted", m[1].length, "chars");
