import path from "node:path";
import { exists, walkFiles, readTextFile } from "./utils.mjs";

const scanRoots = [
  path.join(process.cwd(), "artifacts"),
  path.join(process.cwd(), "tmp"),
  path.join(process.cwd(), "logs"),
  path.join(process.cwd(), "apps", "api", "logs"),
  path.join(process.cwd(), "apps", "api", ".logs"),
  path.join(process.cwd(), "apps", "web", "logs"),
  path.join(process.cwd(), "apps", "web", ".logs")
];

const includeExts = new Set([".log", ".txt", ".json"]);

const patterns = [
  { name: "decrypted_marker", re: /\bdecrypted\b/i },
  { name: "password_or_passphrase_equals", re: /(password|passphrase)\s*=/i },
  { name: "password_or_passphrase_json_key_double_quotes", re: /"(password|passphrase)"\s*:\s*"/i },
  { name: "password_or_passphrase_json_key_single_quotes", re: /'(password|passphrase)'\s*:\s*'/i },
  { name: "email_address", re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  {
    name: "uuid_in_url",
    re: /https?:\/\/[^\s"']*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  },
  {
    name: "uuid_in_path",
    re: /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i
  }
];

const findings = [];

for (const root of scanRoots) {
  if (!exists(root)) continue;

  const files = walkFiles(root, { includeExts });
  for (const filePath of files) {
    const text = readTextFile(filePath);
    if (text == null) continue;

    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const p of patterns) {
        if (p.re.test(line)) {
          findings.push({
            file: path.relative(process.cwd(), filePath),
            lineNo: i + 1,
            pattern: p.name,
            sample: line.slice(0, 200)
          });
        }
      }
    }
  }
}

if (findings.length) {
  console.error("\n[payload:lint] Found banned payload/log patterns (passphrase/password/PII):\n");
  for (const f of findings) {
    console.error(`- ${f.file}:${f.lineNo} [${f.pattern}] ${f.sample}`);
  }
  console.error("\nFix: Remove secrets/PII from logs/artifacts. Never log passphrase/password (any form).\n");
  process.exit(1);
}

console.log("[payload:lint] OK: No banned payload patterns found in scan roots.");

