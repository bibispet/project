# Project LORE

**Repository status date:** 2026-05-06  
**Current implementation state:** S00/S01 foundation: monorepo scaffold, schema contracts, web/API starter apps, and guardrails. The product is not feature-complete yet.

Project LORE is a privacy-first, thick-client family-vault application. The repo currently holds the implementation foundation: binding project rules, staged build plan, web/API apps, Postgres schema baseline, ledger classification, CI gates, fixture-backed UI data seam, and reusable engineering patterns for later stages.

The active build plan is governed by the repo docs, especially `docs/LORE_PROJECT_RUNBOOK.md`, `docs/project_rules.md`, `TODO.md`, `docs/Technical Appendix v9.1.txt`, and `docs/ledger_field_matrix.md`. Treat those files as source of truth for sequencing, production-binding constraints, and privacy/security rules.

## Current repo state

This README was updated after a repo review on **2026-05-06**.

Implemented or scaffolded now:

- pnpm monorepo with `apps/web` and `apps/api`.
- Next.js web app scaffold with a fixture/API repository seam.
- Fastify API scaffold with a `/health` endpoint.
- Postgres schema migration and schema contract tests.
- Ledger field matrix and API response field classification checks.
- CI workflow that installs, lints, applies schema, tests, builds, and runs gates.
- Production-safety gates for payload/log leakage, fixture leakage, devtools leakage, timeline sort-key misuse, and known-bad guardrail cases.
- Dev-only tooling path gated behind `NODE_ENV !== "production"` and `?dev=1`.

Not implemented yet:

- Full tactile/FSM surface.
- Real graph read/write API beyond the scaffold.
- Auth/session/device inventory.
- Crypto worker, upload pipeline, key envelopes, zero-knowledge search, custody flows, and launch evidence artifacts.
- Full self-hosting compose stack with MinIO and production smoke evidence.

Use `TODO.md` and `docs/LORE_PROJECT_RUNBOOK.md` for the staged build order.

## Repository map

```txt
apps/
  api/          Fastify API scaffold, API contracts, DB/schema tests
  web/          Next.js app scaffold, repo seam, fixture/API implementations, devtools gate
schema/
  migrations/   Postgres schema migrations
  README.md     Schema contract and migration notes
docs/           Binding rules, blueprint/runbook, appendix, governance/process docs
scripts/        CI/guardrail scripts used by pnpm gates
.github/        CI workflow
```

## Local development

```bash
pnpm install
pnpm dev
```

The root `dev` script starts both web and API apps:

```bash
pnpm --filter @lore/web dev
pnpm --filter @lore/api dev
```

In development, the web app can use synthetic fixture data through the fixture repo seam:

```bash
NEXT_PUBLIC_VAULT_REPO_MODE=fixture pnpm --filter @lore/web dev
```

Production defaults to the API repository path and keeps fixture imports behind the non-production branch.

## CI and gates

Run the main checks in this order:

```bash
pnpm lint
pnpm test
pnpm build
pnpm gates
```

`pnpm gates` currently runs:

```bash
pnpm ledger:check \
  && pnpm payload:lint \
  && pnpm timelineSortKey:lint \
  && pnpm fixtures:pii-scan \
  && pnpm prod:no-fixtures \
  && pnpm prod:smoke-devtools \
  && pnpm guardrails:known-bad
```

Schema tests require a running Postgres instance and `DATABASE_URL`. CI applies `schema/migrations/000_init.sql` before running tests.

## Key docs

- `docs/project_rules.md` — production-binding implementation rules and non-negotiables.
- `.cursorrules` — Cursor guardrails for implementation work.
- `TODO.md` — staged build order and stop-the-line rules.
- `docs/LORE_PROJECT_RUNBOOK.md` — merged execution order, risk register, prompt pack, and quality gates.
- `docs/ledger_field_matrix.md` — machine-parsed DB/API field classification; enforced by `pnpm ledger:check`.
- `docs/timeline_sort_key.md` — timeline ordering token rules.
- `schema/README.md` — migration and schema validation notes.

## Engineering assets

These repo assets are reusable across Project LORE and other projects, systems, or future repos.

### Concept assets

These are product/architecture ideas worth preserving separately from the current implementation status.

- **Permission rings / trust boundaries**: model authority around a family vault as rings of trust, for example owner/creator, guardians or custodians, active family members, invited contributors, recovery trustees, and external viewers. This still needs a dedicated spec before implementation; it should define view, write, invite, revoke, export, recovery, and custody-transfer powers per ring while respecting the thick-client/dumb-server and ledger rules.
- **Family vault sovereignty**: the vault is treated as family-owned memory infrastructure, not as app-owned content. This drives encryption, custody, export, recovery, and self-hosting decisions.
- **Thick-client / dumb-server boundary**: server stores ciphertext and operational metadata only; user-facing meaning is decrypted client-side.
- **Custody and succession model**: custody transfer, eligibility gates, and rotation flows are first-class concepts, not account-management afterthoughts.
- **Ledger / meaning boundary**: every DB column, API field, cache, log, and analytics event must be classified so human meaning does not silently leak into plaintext infrastructure.
- **Tactile rail mental model**: navigation should feel like a physical family-memory instrument, not a scroll page or infinite graph canvas.
- **FSM travel model**: timeline movement is expressed through named, deterministic states such as REST, IGNITION, CONVEYOR, ARRIVAL, MERGE, CLEARANCE, MORPH, and CONSTRUCTION.
- **Relationship visual grammar**: Focus, Generation Label, and Parent nodes own the connector language; other surfaces should not accumulate incidental graph lines.
- **Bezier Y relationship geometry**: curved, anchored relationship geometry is a reusable visual-system concept for family/lineage surfaces.
- **Kiosk capture mode**: quick memory capture should stay low-friction while preserving encrypt-before-upload and local-only vault-secret constraints.
- **Self-hostable family infrastructure**: deployment should remain portable and understandable enough to run outside a single vendor cloud.

### Architecture and implementation seams

- **VaultRepo seam**: `apps/web/src/repos/VaultRepo.ts`, `FixtureVaultRepo.ts`, `ApiVaultRepo.ts`, and `createVaultRepo.ts` define the fixture-to-API boundary so UI code does not couple directly to backend shape.
- **Ledger classification model**: `docs/ledger_field_matrix.md` plus `scripts/ledger-check.mjs` provide a repeatable way to classify DB/API fields as plaintext-allowed or ciphertext-required.
- **Stop-the-line quality gates**: `TODO.md` and `docs/LORE_PROJECT_RUNBOOK.md` define when feature work must halt for ledger, tactile, or schema failures.
- **Production-binding rule extraction**: `docs/project_rules.md` and `.cursorrules` turn product/architecture constraints into enforceable engineering rules.
- **Prompt and workflow templates**: `docs/LORE_PROJECT_RUNBOOK.md`, `docs/COUNCIL CONSTITUTION v1.1.txt`, and `docs/UNIVERSAL TEMPLATE LIBRARY v1.1.txt` can be reused for structured implementation, review, and escalation loops.

### Code and guardrail patterns

- **Schema drift detection**: `apps/api/src/db/schemaContract.test.ts` validates live database columns against the ledger machine section.
- **Ops/IP metadata guardrails**: `apps/api/src/db/opsIpColumnsContract.test.ts` protects zero-meaning ops metadata expectations.
- **API response field manifest**: `apps/api/src/contracts/api_response_fields.json` and its tests keep API payload fields auditable.
- **Payload/log linting**: `scripts/payload-lint.mjs` scans generated logs/artifacts for emails, password/passphrase markers, decrypted markers, and UUID-in-URL patterns.
- **Fixture containment**: `scripts/fixtures-pii-scan.mjs` and `scripts/prod-no-fixtures.mjs` help keep synthetic fixtures out of production paths.
- **Devtools containment**: `apps/web/src/devtools/*` plus `scripts/prod-smoke-devtools.mjs` demonstrate a sentinel-based production leakage check.
- **Timeline sort-key linting**: `scripts/timelineSortKey-lint.mjs` guards against date-like timeline ordering keys.
- **Known-bad guardrail harness**: `scripts/guardrails-known-bad.mjs` proves gates fail when intentionally bad cases are introduced.

### Useful implementation references

- `apps/web/src/app/page.tsx` — current S00 web entrypoint.
- `apps/web/src/repos/createVaultRepo.ts` — runtime selection between fixture and API repo.
- `apps/web/src/devtools/devtoolsGate.ts` — minimal environment/query-string devtools gate.
- `apps/api/src/index.ts` — current API entrypoint and health route.
- `schema/migrations/000_init.sql` — current database baseline.
- `.github/workflows/ci.yml` — CI order and Postgres-backed test setup.

## Contribution workflow

1. Read `docs/project_rules.md` and `.cursorrules` before implementation.
2. Pick the next unchecked stage from `TODO.md`.
3. Implement the smallest slice that satisfies the stage gate.
4. Run the narrowest relevant test first, then the full command sequence:

   ```bash
   pnpm lint
   pnpm test
   pnpm build
   pnpm gates
   ```

5. If a ledger gate fails once, stop feature work until fixed.
6. If a tactile gate fails twice in a row, stop and escalate per the runbook.

## Notes on dates

- This README status was updated on **2026-05-06**.
- Some planning docs intentionally preserve their original source dates, including the merged blueprint/runbook date of **2025-12-16**. Do not rewrite historical source dates unless the underlying document is superseded.
