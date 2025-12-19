# Project LORE Database Schema

This directory contains the Postgres schema migrations for Project LORE.

## Schema Contract

Column names and enums are **production binding** per Technical Appendix v9.1 §7.1 and §7.3.

The schema contract is enforced by `apps/api/src/db/schemaContract.test.ts`, which validates that the live database schema matches the expected tables/columns defined in `docs/ledger_field_matrix.md`.

## Running Migrations

### Prerequisites

1. Postgres 14+ running (e.g., via `docker compose up -d postgres`)
2. Database connection string in environment variable `DATABASE_URL`

Example `DATABASE_URL`:
```
postgresql://lore_user:lore_password@localhost:5432/lore_db
```

### Apply Migrations

**Option 1: Using psql directly**
```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
psql $DATABASE_URL -f schema/migrations/000_init.sql
```

**Option 2: Using a migration tool (future)**
Once a migration runner is integrated (e.g., node-pg-migrate, Drizzle, or custom), update this section with the appropriate command.

## Schema Validation

Run the schema contract test to verify the database matches the spec:

```bash
# Ensure DATABASE_URL is set
export DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"

# Run schema contract tests
pnpm test apps/api/src/db/schemaContract.test.ts
```

This test will **FAIL** if:
- Any expected table is missing
- Any expected column is missing
- Any unexpected table/column exists (excluding migration bookkeeping tables)

## Schema Structure

### Core Tables (§7.1)
- `families` — Family identifier and encrypted family name
- `profiles` — Person nodes with encrypted profile blobs
- `profile_claims` — Account-to-profile binding + activity tracking
- `relationships` — Parent-child edges with render metadata
- `memories` — Timeline items with encrypted metadata
- `memory_blobs` — Ciphertext blob references
- `key_envelopes` — Encrypted key distribution
- `blind_index_tokens` — Zero-knowledge search tokens
- `custody` — 18-year protocol custody relationships

### Ops Metadata Tables (§7.3)
- `ops_geo_fence_rules` — Geographic access controls
- `ops_network_rules` — IP/ASN-based access controls
- `ops_account_activity` — Account activity tracking (HMAC fingerprints only)
- `ops_security_events` — Security audit log
- `ops_job_runs` — Background job execution log

## Ledger Classification

All database columns are classified in `docs/ledger_field_matrix.md` as either:
- `plaintext_allowed` — Operational metadata
- `ciphertext_required` — User vault content (must never be plaintext server-side)

Per the **Sovereignty Rule**: If the server can avoid knowing it, it must be ciphertext.

## Timeline Ordering

`memories.timeline_sort_key` is a **fractional indexing token** (lexicographically sortable string) that enables timeline ordering without revealing event dates.

See `docs/timeline_sort_key.md` for specification.

**MUST NOT** encode ISO dates or timestamps into `timeline_sort_key`.

## Zero-Knowledge Constraints (§7.3)

Ops metadata tables enforce privacy rules:
- Raw IPs and User-Agents: ephemeral only (edge logs); stored as HMAC fingerprints long-term
- `endpoint_key`: route templates only (e.g., `/profiles/:id/blob`), never full URLs with IDs
- **Forbidden**: profile names, emails, request payloads, vault content, or any decrypted metadata

## Cycle Prevention

Relationship cycles are prevented at application layer + audit job per §7.1.

No database-level cycle prevention is enforced (would require recursive triggers).

## Retention Policies (§7.3)

- `ops_security_events`: 90 days
- `ops_job_runs`: 90 days
- `ops_account_activity`: Lifetime of account
- `ops_geo_fence_rules`: Until explicitly deleted
- `ops_network_rules`: Keep expired for 12 months after `expires_at`, then purge

Implement retention jobs as background tasks.

