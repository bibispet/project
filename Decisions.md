# Project LORE — Launch Decisions (Handoff Context)

**Status:** BINDING  
**Purpose:** Resolves open “Decision Checkpoints” in FINAL_EXECUTION_ORDER.md (Blueprint v1 + Patchset v1.1 Merged) so engineering can start immediately without spec ambiguity.

---

## 1) Auth & Vault Architecture (Decision Checkpoint 1)

**Decision:** **Option A (Decoupled)**

- **Authentication (Server Identity / Sessions):** Must be **passwordless** via Better Auth (Email Magic Link, OTP, or Passkey).
- **Vault Security (Local Encryption):** The user input is a **Vault Passphrase** (local-only secret).
  - Used locally to derive vault keys (e.g., ARK/AKMK per Appendix).
  - **Never sent to the server** (not even hashed).

**Rationale:** Appendix §5.0 invariant: raw password and derived keys must not appear in network payloads.

### Binding Invariants & Gates
- **Invariant:** The Vault Passphrase is never serialized into any network request (headers, query params, body).
- **Invariant:** The server stores **no passphrase verifier** (no password hash, SRP verifier, PAKE verifier, etc.).
- **Allowed:** Server may store **KDF parameters/salt** (non-secret) and **ciphertext-only** key material (e.g., encrypted keychain blob / encrypted AKMK blob), plus the **account public key**.

- **Gate:** Packet capture during onboarding + unlock shows:
  - **NO** raw passphrase
  - **NO** ARK / AKMK / unwrapped private keys
  - **OK:** encrypted keychain/AKMK blob + salt/params + public key
- **Gate:** `pnpm payload:lint` fails CI if `"password"` / `"passphrase"` fields (or equivalents) appear in API logs or request bodies.
- **Gate:** “Known-bad” test exists proving the above gates fail if a dev accidentally adds a passphrase field to any request.

---

## 2) Envelope Crypto Library (Decision Checkpoint 2)

**Decision:** **Option A (libsodium.js)**  
- **Primitive:** X25519 sealed box.

**Rationale:** Appendix §8.1 marks sealed boxes (libsodium.js) as preferred; standardized envelope crypto reduces implementation risk.

---

## 3) Blob Storage Provider (Dev vs Prod)

**Decision:** **MinIO (Prod) / Filesystem (Dev)**  
- **Production:** Self-hosted **MinIO** (S3-compatible).
- **Development:** Filesystem adapter permitted for velocity.

**Rationale:** Appendix allows S3-compatible self-host (MinIO) or filesystem adapter; all stored objects remain ciphertext-only and metadata-minimal.

---

## 4) Membership Model (Decision Checkpoint 5)

**Decision:** **Single-Family MVP**  
- **Implementation:** Derive `family_id` directly from the user’s `profile_claim` (single-family-per-account MVP).
- **Constraint:** Block all cross-family reads/writes and all cross-family edge creation at the API level.

**Rationale:** Patchset v1.1 MVP default to reduce AuthZ complexity while maintaining strict isolation.

---

## 5) S01 Schema Contract Baseline (Council ID-027)

[ID-027] S01 Schema Contract Baseline — acceptance  
Date: December 19, 2025  
Status: DECIDED  
Verdict: MODIFIED  
Reasoning: Gates pass, but the canon contradicted itself on raw IP storage vs ops_network_rules.ip_cidr, so baseline couldn’t be “locked” until clarified.  
Verification: pnpm run gates && pnpm -r test