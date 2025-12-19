import { describe, expect, it, beforeAll } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

// Find repository root by walking up from current file
async function findRepoRoot(): Promise<string> {
  const __filename = fileURLToPath(import.meta.url);
  let currentDir = path.dirname(__filename);
  
  while (true) {
    // Check for pnpm-workspace.yaml or .git
    const workspaceFile = path.join(currentDir, "pnpm-workspace.yaml");
    const gitDir = path.join(currentDir, ".git");
    
    try {
      await fs.access(workspaceFile);
      return currentDir;
    } catch {
      // Try .git
      try {
        await fs.access(gitDir);
        return currentDir;
      } catch {
        // Move up one directory
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
          throw new Error(
            `Could not find repository root (no pnpm-workspace.yaml or .git found). ` +
            `Started search from: ${path.dirname(__filename)}`
          );
        }
        currentDir = parentDir;
      }
    }
  }
}

// Parse ledger MACHINE SECTION to get expected schema
async function loadExpectedSchema(): Promise<Record<string, string[]>> {
  const repoRoot = await findRepoRoot();
  const ledgerPath = path.join(repoRoot, "docs", "ledger_field_matrix.md");
  
  let content: string;
  try {
    content = await fs.readFile(ledgerPath, "utf8");
  } catch (err) {
    throw new Error(
      `Failed to load ledger file at resolved path: ${ledgerPath}\n` +
      `Repository root: ${repoRoot}\n` +
      `Original error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Extract MACHINE SECTION JSON
  const marker = "## MACHINE SECTION";
  const markerIdx = content.indexOf(marker);
  if (markerIdx === -1) {
    throw new Error("Missing '## MACHINE SECTION' in docs/ledger_field_matrix.md");
  }

  const after = content.slice(markerIdx);
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
  const parsed = JSON.parse(jsonText);

  if (!parsed.database_tables || typeof parsed.database_tables !== "object") {
    throw new Error("Ledger MACHINE SECTION must include 'database_tables' object");
  }

  // Convert to map of table -> column[]
  const expected: Record<string, string[]> = {};
  for (const [tableName, columns] of Object.entries(parsed.database_tables)) {
    if (typeof columns !== "object" || columns === null) {
      throw new Error(`Invalid columns for table ${tableName}`);
    }
    expected[tableName] = Object.keys(columns as Record<string, string>);
  }

  return expected;
}

// Query actual database schema
async function loadActualSchema(pool: pg.Pool): Promise<Record<string, string[]>> {
  const query = `
    SELECT 
      table_name,
      column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name NOT IN ('schema_migrations', 'migrations', '_prisma_migrations')
    ORDER BY table_name, ordinal_position;
  `;

  const result = await pool.query(query);

  const actual: Record<string, string[]> = {};
  for (const row of result.rows) {
    const tableName = row.table_name;
    const columnName = row.column_name;

    if (!actual[tableName]) {
      actual[tableName] = [];
    }
    actual[tableName].push(columnName);
  }

  return actual;
}

describe("Schema Contract (Technical Appendix §7.1 + §7.3)", () => {
  let pool: pg.Pool;
  let expectedSchema: Record<string, string[]>;
  let actualSchema: Record<string, string[]>;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL environment variable not set. " +
        "Example: postgresql://user:pass@localhost:5432/dbname"
      );
    }

    // Load expected schema from ledger
    expectedSchema = await loadExpectedSchema();

    // Connect to database and load actual schema
    pool = new Pool({ connectionString: databaseUrl });
    actualSchema = await loadActualSchema(pool);

    return async () => {
      await pool.end();
    };
  });

  it("should have all expected tables present", () => {
    const expectedTables = Object.keys(expectedSchema).sort();
    const actualTables = Object.keys(actualSchema).sort();

    const missingTables = expectedTables.filter((t) => !actualTables.includes(t));

    if (missingTables.length > 0) {
      throw new Error(
        `Missing tables in database schema:\n` +
        missingTables.map((t) => `  - ${t}`).join("\n") +
        `\n\nRun: psql $DATABASE_URL -f schema/migrations/000_init.sql`
      );
    }

    expect(missingTables).toEqual([]);
  });

  it("should have no unexpected tables", () => {
    const expectedTables = Object.keys(expectedSchema).sort();
    const actualTables = Object.keys(actualSchema).sort();

    const unexpectedTables = actualTables.filter((t) => !expectedTables.includes(t));

    if (unexpectedTables.length > 0) {
      throw new Error(
        `Unexpected tables in database schema (not in ledger):\n` +
        unexpectedTables.map((t) => `  - ${t}`).join("\n") +
        `\n\nThese tables must be either:\n` +
        `  1. Added to docs/ledger_field_matrix.md (if intentional), OR\n` +
        `  2. Removed from the database (if accidental)`
      );
    }

    expect(unexpectedTables).toEqual([]);
  });

  it("should have all expected columns for each table", () => {
    const errors: string[] = [];

    for (const [tableName, expectedColumns] of Object.entries(expectedSchema)) {
      const actualColumns = actualSchema[tableName] || [];

      const missingColumns = expectedColumns.filter((c) => !actualColumns.includes(c));

      if (missingColumns.length > 0) {
        errors.push(
          `Table '${tableName}' is missing columns:\n` +
          missingColumns.map((c) => `    - ${c}`).join("\n")
        );
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Schema validation failed:\n\n` +
        errors.join("\n\n") +
        `\n\nFix: Update schema/migrations/000_init.sql and rerun migration.`
      );
    }

    expect(errors).toEqual([]);
  });

  it("should have no unexpected columns for each table", () => {
    const errors: string[] = [];

    for (const [tableName, actualColumns] of Object.entries(actualSchema)) {
      const expectedColumns = expectedSchema[tableName] || [];

      const unexpectedColumns = actualColumns.filter((c) => !expectedColumns.includes(c));

      if (unexpectedColumns.length > 0) {
        errors.push(
          `Table '${tableName}' has unexpected columns (not in ledger):\n` +
          unexpectedColumns.map((c) => `    - ${c}`).join("\n")
        );
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Schema drift detected:\n\n` +
        errors.join("\n\n") +
        `\n\nThese columns must be either:\n` +
        `  1. Added to docs/ledger_field_matrix.md (if intentional), OR\n` +
        `  2. Removed from schema/migrations/*.sql (if accidental)`
      );
    }

    expect(errors).toEqual([]);
  });

  it("should match ledger classification count", () => {
    const expectedTableCount = Object.keys(expectedSchema).length;
    const actualTableCount = Object.keys(actualSchema).length;

    expect(actualTableCount).toBe(expectedTableCount);

    let expectedTotalColumns = 0;
    let actualTotalColumns = 0;

    for (const cols of Object.values(expectedSchema)) {
      expectedTotalColumns += cols.length;
    }

    for (const cols of Object.values(actualSchema)) {
      actualTotalColumns += cols.length;
    }

    expect(actualTotalColumns).toBe(expectedTotalColumns);
  });
});

