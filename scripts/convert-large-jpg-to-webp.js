const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = process.cwd();
const MIN_SIZE_BYTES = 200 * 1024;
const QUALITY = Number(process.env.WEBP_QUALITY || 75);
const HTML_FILES = ["index.html", "home.html"];
const SKIP_DIRS = new Set([".git", "node_modules", ".vscode"]);

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(fullPath, out);
      continue;
    }
    out.push(fullPath);
  }
  return out;
}

function toPosixRel(absPath) {
  return path.relative(ROOT, absPath).split(path.sep).join("/");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main() {
  const files = walk(ROOT);
  const jpgFiles = files.filter((file) => /\.(jpe?g)$/i.test(file));
  const candidates = jpgFiles.filter((file) => fs.statSync(file).size >= MIN_SIZE_BYTES);

  const convertedMap = new Map();
  let convertedCount = 0;
  let skippedCount = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  for (const jpg of candidates) {
    const stat = fs.statSync(jpg);
    const webp = jpg.replace(/\.(jpe?g)$/i, ".webp");
    try {
      await sharp(jpg).webp({ quality: QUALITY, effort: 4 }).toFile(webp);
      const webpStat = fs.statSync(webp);
      bytesBefore += stat.size;
      bytesAfter += webpStat.size;
      convertedMap.set(toPosixRel(jpg), toPosixRel(webp));
      convertedCount += 1;
    } catch (err) {
      skippedCount += 1;
      console.error(`Failed: ${toPosixRel(jpg)} (${err.message})`);
    }
  }

  for (const htmlFile of HTML_FILES) {
    const htmlPath = path.join(ROOT, htmlFile);
    if (!fs.existsSync(htmlPath)) continue;
    let content = fs.readFileSync(htmlPath, "utf8");
    for (const [jpgRel, webpRel] of convertedMap.entries()) {
      const rx = new RegExp(escapeRegex(jpgRel), "g");
      content = content.replace(rx, webpRel);
    }
    fs.writeFileSync(htmlPath, content, "utf8");
  }

  const saved = bytesBefore - bytesAfter;
  const pct = bytesBefore > 0 ? ((saved / bytesBefore) * 100).toFixed(2) : "0.00";
  console.log(`Candidates: ${candidates.length}`);
  console.log(`Converted: ${convertedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Before (MB): ${(bytesBefore / 1024 / 1024).toFixed(2)}`);
  console.log(`After  (MB): ${(bytesAfter / 1024 / 1024).toFixed(2)}`);
  console.log(`Saved  (MB): ${(saved / 1024 / 1024).toFixed(2)} (${pct}%)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
