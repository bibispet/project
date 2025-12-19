# Project LORE (S00 Scaffold)

This repository is scaffolded to satisfy Stage **S00** gates and CI ordering.

## Key docs
- `docs/project_rules.md` (production binding rules)
- `.cursorrules` (Cursor Composer guardrails)
- `TODO.md` (build order + stop-the-line rules)
- `docs/ledger_field_matrix.md` (machine-parsed ledger classification; enforced by `pnpm ledger:check`)

## Local dev
```bash
pnpm install
pnpm dev
```

## CI / Gates (run in this order)
```bash
pnpm lint
pnpm test
pnpm build
pnpm gates
```

