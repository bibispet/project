# TODO.md — Project LORE Build Order (Day 0 → Launch)

> STOP THE LINE RULES:
> - [ ] If Ledger gate fails ONCE: STOP until fixed (no new features).
> - [ ] If a tactile gate fails TWICE in a row: STOP + escalate (physics rewire required).

## Phase 0 — Contracts & Scaffold
- [ ] S00 Repo Bootstrap: `pnpm i && pnpm dev` → apps/web + apps/api running; artifacts: docs/project_rules.md, .cursorrules
- [ ] S01 Schema Lock + Ledger Matrix: `docker compose up -d postgres` + `pnpm test` → schemaContract tests pass; artifacts: schema/migrations, docs/ledger_field_matrix.md
- [ ] S02 Dev Stack: `docker compose up` → postgres + minio healthy; bucket created

## Phase 1 — Tactile Surface Foundations (Overrides F + §3.1)
- [ ] S03 Viewport Stability: run web on iOS Safari + Android Chrome; artifact: docs/launch_evidence/viewport_stability_notes.md
- [ ] S04 Universal Drag Rail + Pointer Safety: `pnpm test` (rail tests) + device drag test
- [ ] S05 Scene Graph (Focus/Parents/GenLabel only) + "only these nodes get lines": `pnpm test` (onlyLinesRule)

## Phase 2 — Geometry & Connectors (Override A/B/C + §3.4)
- [ ] S06 Curved Bezier Y + Anchors + solid/dotted truth table: `pnpm test` (geometry)
- [ ] S07 Lens Toggle Unplug/Replug (no crossfade): manual script + timing test
- [ ] S08 Implosion Suction (mass-conservation feel): record short demo video
- [ ] S09 Physics constants + PHYSICS_SPEC_VERSION gate: `pnpm test` (version test)

## Phase 3 — FSM Navigation (LOCKED §3.6)
- [ ] S10 Sequence A (DOWN) REST→MERGE: manual drag script + `pnpm test`
- [ ] S11 Sequence A2 (Horizontal choose parent): thresholds + clunk; `pnpm test`
- [ ] S12 Sequence B (UP) CLEARANCE→CONSTRUCTION: spouse→line→stem→child order verified

## Phase 4 — Core UI Contracts (LOCKED §4)
- [ ] S13 Nav pill + capture "+" + Read/Edit + InfoCards + SiblingDrawer: manual checklist + screenshot evidence
- [ ] S14 Deterministic selection rules: slot_hint, >2 parents overflow, siblings by lens: `pnpm test`

## Phase 5 — Guard Backend + Auth (LOCKED §6)
- [ ] S15 Guard skeleton + Better Auth session/device inventory + revoke-all: integration tests pass
- [ ] S16 Graph slice APIs + family scoping: integration tests pass

## Phase 6 — Crypto (Override G + LOCKED §8)
- [ ] S17 Crypto Worker: run perf harness; confirm drag remains responsive during encryption
- [ ] S18 Registration & Key Setup modal: packet-sniff verify "no password/keys in network payload"

## Phase 7 — Upload Pipeline (LOCKED §1.3 + §5.1)
- [ ] S19 Secure Upload modal + encrypt-before-upload + MinIO + DB rows: packet-sniff proof; upload UX states

## Phase 8 — Access Control + Search + 18-Year Protocol
- [ ] S20 Access Control modal + envelopes create/revoke + truth-in-security note
- [ ] S21 Zero-knowledge search tokens + search UI
- [ ] S22 Custody table + eligible_at enforcement (pre-eligible block)
- [ ] S23 Transfer ownership flow + revoke custodian sessions (post-eligible)

## Phase 9 — Ops + Deploy + Launch Gate
- [ ] S24 Ops metadata tables + HMAC IP/UA + retention: verify no raw IP long-term and no payload logging
- [ ] S25 Full self-host compose: `docker compose -f docker-compose.prod.yml up`
- [ ] S26 Production Readiness Gate (LOCKED §12): collect evidence artifacts under docs/launch_evidence/

## Architect Override Reminders (Do not forget)
- Curved Bezier Y geometry (Override A)
- Explicit anchors & anchor updates (Override B)
- Only Focus/GenLabel/Parents get lines (Override C)
- Implosion suction (Override D)
- Lens Unplug/Replug (Override E)
- Viewport stability (Override F)
- Non-blocking crypto (Override G)

