import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { mkdirp } from "./utils.mjs";

function runPnpm(args, { expectNonZero = false } = {}) {
  const res = spawnSync("pnpm", args, {
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32"
  });

  if (res.error) {
    throw new Error(`Failed to spawn pnpm: ${res.error.message}`);
  }

  const code = res.status;
  if (code == null) {
    throw new Error(`pnpm returned null exit status (stdout=${String(res.stdout)} stderr=${String(res.stderr)})`);
  }

  if (expectNonZero) {
    if (code === 0) {
      console.error(res.stdout || "");
      console.error(res.stderr || "");
      throw new Error(`Expected pnpm ${args.join(" ")} to FAIL, but it PASSED.`);
    }
    return;
  }

  if (code !== 0) {
    console.error(res.stdout || "");
    console.error(res.stderr || "");
    throw new Error(`pnpm ${args.join(" ")} failed unexpectedly (exit ${code}).`);
  }
}

async function main() {
  console.log("[guardrails:known-bad] Starting known-bad proofs...");

  // 1) Prove payload:lint fails on known-bad patterns:
  //    - temp log contains password=knownbad
  //    - request body shape contains {"passphrase":"knownbad"}
  const artifactsDir = path.join(process.cwd(), "artifacts");
  mkdirp(artifactsDir);

  const badLog = path.join(artifactsDir, "knownbad_payload.log");
  const badReq = path.join(artifactsDir, "knownbad_request.json");

  fs.writeFileSync(badLog, "INFO password=knownbad\n", "utf8");
  fs.writeFileSync(badReq, JSON.stringify({ passphrase: "knownbad" }) + "\n", "utf8");

  try {
    runPnpm(["payload:lint"], { expectNonZero: true });
    console.log("[guardrails:known-bad] OK: payload:lint failed as expected.");
  } finally {
    try {
      fs.unlinkSync(badLog);
    } catch {}
    try {
      fs.unlinkSync(badReq);
    } catch {}
  }

  // 2) Prove ledger:check fails when an unclassified field is added, then passes after restore
  const manifestPath = path.join(process.cwd(), "apps", "api", "src", "contracts", "api_response_fields.json");
  const original = fs.readFileSync(manifestPath, "utf8");

  try {
    const parsed = JSON.parse(original);
    parsed.endpoints[0].responseFields.push("unclassified_field__knownbad");
    fs.writeFileSync(manifestPath, JSON.stringify(parsed, null, 2) + "\n", "utf8");

    runPnpm(["ledger:check"], { expectNonZero: true });
    console.log("[guardrails:known-bad] OK: ledger:check failed as expected when field unclassified.");
  } finally {
    fs.writeFileSync(manifestPath, original, "utf8");
  }

  // Confirm it passes again after restore
  runPnpm(["ledger:check"]);
  console.log("[guardrails:known-bad] OK: ledger:check passes after restore.");

  console.log("[guardrails:known-bad] SUCCESS: All known-bad proofs behaved correctly.");
}

main().catch((err) => {
  console.error(`\n[guardrails:known-bad] FAIL: ${err.message}\n`);
  process.exit(1);
});

