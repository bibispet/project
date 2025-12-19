import path from "node:path";
import { exists, walkFiles, fileContainsNeedle, readTextFile } from "./utils.mjs";

const NEXT_DIR = path.join(process.cwd(), "apps", "web", ".next");
const sentinel = "DEVTOOLS_DO_NOT_SHIP";

function fail(msg) {
  console.error(`\n[prod:smoke-devtools] FAIL: ${msg}\n`);
  process.exit(1);
}

if (!exists(NEXT_DIR)) {
  fail("apps/web/.next not found. Run `pnpm build` (or `pnpm --filter @lore/web build`) before prod:smoke-devtools.");
}

// 1) Ensure no /devtools route exists in Next manifests (if present)
const jsonFiles = walkFiles(NEXT_DIR, { includeExts: new Set([".json"]) });
const routeHits = [];

for (const jf of jsonFiles) {
  const base = path.basename(jf).toLowerCase();
  if (!base.includes("manifest")) continue;

  const txt = readTextFile(jf);
  if (!txt) continue;

  if (/\/devtools\b/i.test(txt)) {
    routeHits.push(path.relative(process.cwd(), jf));
  }
}

if (routeHits.length) {
  console.error("\n[prod:smoke-devtools] devtools route detected in Next manifest JSON:");
  for (const h of routeHits) console.error(`- ${h}`);
  console.error("\nFix: devtools must not be a route in production builds.\n");
  process.exit(1);
}

// 2) Ensure sentinel string is NOT present anywhere in .next output
const files = walkFiles(NEXT_DIR, { includeExts: new Set([".js", ".mjs", ".json", ".css", ".map", ".txt"]) });

const sentinelHits = [];
for (const f of files) {
  // eslint-disable-next-line no-await-in-loop
  const has = await fileContainsNeedle(f, sentinel);
  if (has) sentinelHits.push(path.relative(process.cwd(), f));
}

if (sentinelHits.length) {
  console.error("\n[prod:smoke-devtools] DEVTOOLS SENTINEL FOUND in production build output (devtools shipped!):");
  for (const h of sentinelHits) console.error(`- ${h}`);
  console.error("\nFix: devtools must be excluded from production bundles.\n");
  process.exit(1);
}

console.log("[prod:smoke-devtools] OK: No devtools routes and sentinel not found in apps/web/.next output.");

