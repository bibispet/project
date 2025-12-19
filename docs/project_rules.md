# Project LORE — Project Rules (Production Binding)

This repo implements Project LORE per "Technical Appendix v9.1" (Production Binding) + Architect Overrides A–G.

## 0) Change Control
- Any Appendix section marked **LOCKED** may NOT be modified in implementation intent without Architect + Product approval.
- If unsure whether something is LOCKED, treat it as LOCKED until confirmed.

## 1) Absolute Non-Negotiables (LOCKED)
- No native scroll physics as source of truth for traversal.
- Main surface must use touch-action:none, Pointer Events + pointer capture, 1:1 pointer deltas.
- Renderer must be custom DOM rail + SVG connector layer. No infinite-canvas graph libraries.
- Render window: exactly 2 generations (Focus + Parents). Never render deeper generations simultaneously.
- Server must never decrypt user vault content.
- No free-pan infinite canvas. No zoom gestures. Navigation is only via the FSM travel sequences.
- One Test Harness: Use Vitest for unit/integration and Playwright for UI/e2e/manual scripts. Do not introduce Cypress.
- Synthetic Fixtures Only: Fixtures must be synthetic (fake data); never commit real names/photos/DOB. Add a "PII scanner" gate for fixtures.
- Auth Hard Constraint: Account authentication (Better Auth) must NOT use the Vault Password. The Vault Password is a local-only secret for ARK derivation.
- Parallelism Allowed: S01 (Schema) can run in parallel with S03/S04 (UI); UI uses FixtureVaultRepo until ApiVaultRepo exists.

## 2) Binding Names / Contracts (DO NOT RENAME)
- FSM state names: REST, IGNITION, CONVEYOR, ARRIVAL, MERGE, CLEARANCE, MORPH, CONSTRUCTION.
- Postgres schema column names and enums per Appendix §7.x (binding).
- Physics constants file: physics/constants.ts; bump PHYSICS_SPEC_VERSION on any constant change.
- timeline_sort_key is a fractional-indexing token (lexicographically sortable string). Never encode ISO dates / timestamps into timeline_sort_key.

## 3) Ledger Gate (Security Veto)
For every:
- DB field
- API payload
- auth/session field
- log line
- analytics event
- client cache/persistence
You MUST classify against Appendix §2.1–§2.3.
- If server can avoid knowing it, it must be ciphertext.
- Never store profile meaning fields (name/DOB/bio/etc) server-side plaintext.
- Never transmit raw media bytes or vault keys unencrypted.
- Logs + ops tables must not store profile names, emails, request payloads, raw IPs, or URLs containing IDs. Use endpoint_key (route template) + request_id; store ip_hmac/user_agent_hmac only.

## 4) Pointer Safety (Binding)
- Acquire pointer capture on drag start; release on end/cancel.
- On pointercancel: immediately safe snapback animation and return to REST.
- Multitouch: only first pointer authoritative; ignore others until release.

## 5) Connector / Line Rules (Architect Override C)
- ONLY these nodes participate in connector lines:
  - Focus bubble
  - Generation Label bubble
  - Parent bubbles
- Everything else has NO timeline connector lines (memories, drawers, sibling expansion, etc).

## 6) Curved "Bezier Y" Geometry + Anchors (Architect Override A + B)
- Y must be smooth curved bezier "Y" (organic, vein-like; not angular).
- Branch origin: TOP-CENTER of Generation Label bubble.
- Maternal branch curves up/out LEFT, lands on INNER SIDE of LEFT parent bubble (side closest to center).
- Paternal branch curves up/out RIGHT, lands on INNER SIDE of RIGHT parent bubble.
- Line must land on SIDE of each parent bubble (not top/bottom).
- Define explicit SVG anchor points for Focus, Generation Label, Parents.
- Anchors must update during FSM travel sequences and lens toggles.

## 7) Implosion Visual (Architect Override D)
- When nodes hide/collapse, they must visually "suck into" or "fold behind" the Focus bubble.
- No simple dissolve/cross-fade shortcut.

## 8) Lens Toggle Fidelity (Architect Override E)
- Lens switching must be Unplug/Replug (LOCKED §3.5): retract old line → fade old node → draw new connector → fade new node only after the new line reaches its target. No crossfade.
- No simple cross-fade between states.

## 9) Viewport Stability (Architect Override F)
- Main tactile surface must not jitter/resize due to mobile browser UI.
- Do not rely on naive 100vh if it causes address-bar jitter.
- Must pass iOS Safari + Android Chrome stability gate.

## 10) Non-Blocking Crypto (Architect Override G)
- Key derivation and encryption must NOT block/stutter main UI thread.
- Use worker/off-main-thread strategy with user-visible progress:
  "Deriving Keys…" / "Encrypting…" / "Uploading…"

