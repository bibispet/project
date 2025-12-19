import fs from "node:fs";
import path from "node:path";
import { exists, extractMachineJsonFromLedgerMarkdown } from "./utils.mjs";

const LEDGER_PATH = path.join(process.cwd(), "docs", "ledger_field_matrix.md");
const MANIFEST_PATH = path.join(
  process.cwd(),
  "apps",
  "api",
  "src",
  "contracts",
  "api_response_fields.json"
);

function fail(msg) {
  console.error(`\n[ledger:check] FAIL: ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[ledger:check] OK: ${msg}`);
}

if (!exists(LEDGER_PATH)) {
  fail(`Missing required file: ${LEDGER_PATH}`);
}
if (!exists(MANIFEST_PATH)) {
  fail(`Missing required file: ${MANIFEST_PATH}`);
}

let ledger;
try {
  const md = fs.readFileSync(LEDGER_PATH, "utf8");
  ledger = extractMachineJsonFromLedgerMarkdown(md);
} catch (err) {
  fail(`Unable to parse MACHINE SECTION JSON in docs/ledger_field_matrix.md: ${err.message}`);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
} catch (err) {
  fail(`Unable to parse apps/api/src/contracts/api_response_fields.json: ${err.message}`);
}

if (!ledger.api_response_fields || typeof ledger.api_response_fields !== "object") {
  fail("Ledger MACHINE SECTION must include object: api_response_fields");
}
if (!Array.isArray(manifest.endpoints)) {
  fail("API manifest must include array: endpoints");
}

const allowedClasses = new Set(["plaintext_allowed", "ciphertext_required"]);

const missing = [];
const invalid = [];

for (const ep of manifest.endpoints) {
  const method = String(ep.method || "").toUpperCase();
  const route = String(ep.path || "");
  const responseFields = Array.isArray(ep.responseFields) ? ep.responseFields : [];

  const key = `${method} ${route}`;
  const clsMap = ledger.api_response_fields[key] || {};

  for (const field of responseFields) {
    const cls = clsMap[field];
    if (!cls) {
      missing.push({ endpoint: key, field });
      continue;
    }
    if (!allowedClasses.has(cls)) {
      invalid.push({ endpoint: key, field, cls });
    }
  }
}

if (missing.length) {
  console.error("\n[ledger:check] Missing classifications:");
  for (const m of missing) {
    console.error(`- ${m.endpoint} :: ${m.field}`);
  }
  console.error("\nFix: Add these to docs/ledger_field_matrix.md MACHINE SECTION under api_response_fields.\n");
  process.exit(1);
}

if (invalid.length) {
  console.error("\n[ledger:check] Invalid classification values:");
  for (const m of invalid) {
    console.error(`- ${m.endpoint} :: ${m.field} = ${m.cls}`);
  }
  console.error("\nAllowed values: plaintext_allowed | ciphertext_required\n");
  process.exit(1);
}

ok("All api_response_fields are classified in docs/ledger_field_matrix.md");

