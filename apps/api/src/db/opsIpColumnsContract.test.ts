import { describe, expect, it, beforeAll, afterAll } from "vitest";
import pg from "pg";

const { Pool } = pg;

describe("Ops IP Columns Contract", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL environment variable not set.");
    pool = new Pool({ connectionString: databaseUrl });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("forbids inet/cidr columns outside ops_network_rules.ip_cidr", async () => {
    const res = await pool.query(`
      SELECT table_name, column_name, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND udt_name IN ('inet', 'cidr')
      ORDER BY table_name, column_name;
    `);

    const allowed = new Set(["ops_network_rules.ip_cidr"]);
    const violations = res.rows
      .map((r) => `${r.table_name}.${r.column_name}`)
      .filter((fq) => !allowed.has(fq));

    if (violations.length) {
      throw new Error(
        `inet/cidr columns are forbidden outside ops_network_rules.ip_cidr.\n` +
          `Violations:\n` +
          violations.map((v) => `  - ${v}`).join("\n")
      );
    }

    expect(violations).toEqual([]);
  });
});
