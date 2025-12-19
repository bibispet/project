import path from "node:path";
import { exists, walkFiles, readTextFile } from "./utils.mjs";

function validateSortKey(value) {
  if (typeof value !== "string") return null;

  const reasons = [];
  if (value.includes("=")) reasons.push("must not contain '=' padding");
  if (!/^[A-Za-z0-9_-]+$/.test(value)) reasons.push("must be base64url charset [A-Za-z0-9_-] only");
  if (value.length < 8) reasons.push("must be length >= 8");
  if (/\b\d{4}-\d{2}-\d{2}\b/.test(value)) reasons.push("must not look like YYYY-MM-DD");
  if (/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) reasons.push("must not look like ISO timestamp");

  return reasons.length ? reasons.join("; ") : null;
}

function walkJson(obj, onKey) {
  if (Array.isArray(obj)) {
    for (const v of obj) walkJson(v, onKey);
    return;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      onKey(k, v);
      walkJson(v, onKey);
    }
  }
}

const scanDirs = [
  path.join(process.cwd(), "apps"),
  path.join(process.cwd(), "fixtures"),
  path.join(process.cwd(), "scripts")
].filter(exists);

const includeExts = new Set([".ts", ".tsx", ".js", ".mjs", ".json"]);

const violations = [];

for (const dir of scanDirs) {
  const files = walkFiles(dir, { includeExts });
  for (const filePath of files) {
    const rel = path.relative(process.cwd(), filePath);
    if (rel.includes(path.sep + ".next" + path.sep)) continue;
    if (rel.includes(path.sep + "node_modules" + path.sep)) continue;
    if (rel.includes(path.sep + "dist" + path.sep)) continue;

    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".json") {
      const txt = readTextFile(filePath);
      if (txt == null) continue;
      let parsed;
      try {
        parsed = JSON.parse(txt);
      } catch {
        continue;
      }
      walkJson(parsed, (k, v) => {
        if (k === "timeline_sort_key" || k === "timelineSortKey") {
          const err = validateSortKey(v);
          if (err) violations.push({ file: rel, key: k, value: String(v), err });
        }
      });
    } else {
      const txt = readTextFile(filePath);
      if (txt == null) continue;

      const re = /(timeline_sort_key|timelineSortKey)\s*[:=]\s*["']([^"']+)["']/g;
      let m;
      while ((m = re.exec(txt)) !== null) {
        const key = m[1];
        const value = m[2];
        const err = validateSortKey(value);
        if (err) violations.push({ file: rel, key, value, err });
      }
    }
  }
}

if (violations.length) {
  console.error("\n[timelineSortKey:lint] Invalid timeline_sort_key values found:\n");
  for (const v of violations) {
    console.error(`- ${v.file} :: ${v.key}="${v.value}" → ${v.err}`);
  }
  console.error("\nFix: timeline_sort_key must be a non-date base64url token (fractional indexing).\n");
  process.exit(1);
}

console.log("[timelineSortKey:lint] OK: No invalid timeline_sort_key values found.");

