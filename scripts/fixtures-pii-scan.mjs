import path from "node:path";
import { exists, walkFiles, readTextFile } from "./utils.mjs";

const fixtureDirs = [
  path.join(process.cwd(), "apps", "web", "src", "fixtures"),
  path.join(process.cwd(), "apps", "api", "src", "fixtures")
].filter(exists);

const imageExts = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic"]);
const textExts = new Set([".json", ".txt", ".md", ".ts", ".tsx"]);

const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phoneRe = /\b(?:\+?\d{1,2}[\s-]?)?(?:\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})\b/;
const ssnRe = /\b\d{3}-\d{2}-\d{4}\b/;

// DOB detection (case-insensitive keys). Only flag ISO dates when a DOB key is present in the same file.
const dobKeyRe = /(?:"|')?(dob|date_of_birth|dateOfBirth)(?:"|')?\s*[:=]/i;
const isoDateRe = /\b\d{4}-\d{2}-\d{2}\b/;

const findings = [];

for (const dir of fixtureDirs) {
  const files = walkFiles(dir);
  for (const filePath of files) {
    const rel = path.relative(process.cwd(), filePath);
    const ext = path.extname(filePath).toLowerCase();

    if (imageExts.has(ext)) {
      findings.push({ file: rel, issue: "binary_image_file_not_allowed" });
      continue;
    }

    if (textExts.has(ext)) {
      const text = readTextFile(filePath);
      if (text == null) continue;

      if (emailRe.test(text)) findings.push({ file: rel, issue: "email_address_detected" });
      if (phoneRe.test(text)) findings.push({ file: rel, issue: "phone_number_detected" });
      if (ssnRe.test(text)) findings.push({ file: rel, issue: "ssn_detected" });

      const hasDobKey = dobKeyRe.test(text);
      if (hasDobKey && isoDateRe.test(text)) {
        findings.push({
          file: rel,
          issue: "dob_iso_date_detected",
          reason: "DOB key present and ISO date (YYYY-MM-DD) found in same file"
        });
      }
    }
  }
}

if (findings.length) {
  console.error("\n[fixtures:pii-scan] Potential PII detected in fixtures:");
  for (const f of findings) {
    const extra = f.reason ? ` — ${f.reason}` : "";
    console.error(`- ${f.file} [${f.issue}]${extra}`);
  }
  console.error("\nFix: Fixtures must be synthetic and must not contain real PII or photos.\n");
  process.exit(1);
}

console.log("[fixtures:pii-scan] OK: No obvious PII detected in fixtures.");

