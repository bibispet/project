import path from "node:path";
import { exists, walkFiles, fileContainsNeedle } from "./utils.mjs";

const NEXT_DIR = path.join(process.cwd(), "apps", "web", ".next");
const needle = "FixtureVaultRepo";

function fail(msg) {
  console.error(`\n[prod:no-fixtures] FAIL: ${msg}\n`);
  process.exit(1);
}

if (!exists(NEXT_DIR)) {
  fail("apps/web/.next not found. Run `pnpm build` (or `pnpm --filter @lore/web build`) before prod:no-fixtures.");
}

const includeExts = new Set([".js", ".mjs", ".json", ".css", ".map", ".txt"]);
const files = walkFiles(NEXT_DIR, { includeExts });

const hits = [];
for (const f of files) {
  // eslint-disable-next-line no-await-in-loop
  const has = await fileContainsNeedle(f, needle);
  if (has) hits.push(path.relative(process.cwd(), f));
}

if (hits.length) {
  console.error("\n[prod:no-fixtures] Found FixtureVaultRepo in production build output:");
  for (const h of hits) console.error(`- ${h}`);
  console.error("\nFix: Ensure fixture repo code is excluded from production builds; scan must be clean.\n");
  process.exit(1);
}

console.log("[prod:no-fixtures] OK: No FixtureVaultRepo in apps/web/.next output.");

