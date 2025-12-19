import fs from "node:fs";
import path from "node:path";

export const DEFAULT_IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".cache"
]);

export function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

export function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function walkFiles(rootDir, { includeExts = null, ignoreDirs = DEFAULT_IGNORED_DIRS } = {}) {
  const out = [];
  const stack = [rootDir];

  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ignoreDirs.has(ent.name)) continue;
        stack.push(full);
      } else if (ent.isFile()) {
        if (includeExts) {
          const ext = path.extname(ent.name).toLowerCase();
          if (!includeExts.has(ext)) continue;
        }
        out.push(full);
      }
    }
  }

  return out;
}

export function readTextFile(filePath) {
  const buf = fs.readFileSync(filePath);
  // If there are NUL bytes, treat as binary and skip.
  if (buf.includes(0)) return null;
  return buf.toString("utf8");
}

export function extractMachineJsonFromLedgerMarkdown(mdText) {
  const marker = "## MACHINE SECTION";
  const markerIdx = mdText.indexOf(marker);
  if (markerIdx === -1) {
    throw new Error("Missing '## MACHINE SECTION' in docs/ledger_field_matrix.md");
  }

  const after = mdText.slice(markerIdx);
  const fenceStart = after.indexOf("```json");
  if (fenceStart === -1) {
    throw new Error("Missing ```json fence after MACHINE SECTION");
  }

  const jsonStart = fenceStart + "```json".length;
  const fenceEnd = after.indexOf("```", jsonStart);
  if (fenceEnd === -1) {
    throw new Error("Missing closing ``` fence for MACHINE SECTION json");
  }

  const jsonText = after.slice(jsonStart, fenceEnd).trim();
  return JSON.parse(jsonText);
}

export async function fileContainsNeedle(filePath, needle) {
  // Stream scan for large files (Windows-safe, no grep)
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { encoding: "utf8" });
    let carry = "";
    stream.on("data", (chunk) => {
      const data = carry + chunk;
      if (data.includes(needle)) {
        stream.destroy();
        return resolve(true);
      }
      carry = data.slice(-Math.max(needle.length - 1, 0));
    });
    stream.on("error", reject);
    stream.on("close", () => resolve(false));
  });
}

