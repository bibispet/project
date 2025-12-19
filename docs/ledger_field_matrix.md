# Ledger Field Matrix

This document is the binding classification ledger for what may be plaintext vs what must be ciphertext.

- The **MACHINE SECTION** JSON below is parsed by CI via `pnpm ledger:check`.
- Database schema contract tests parse the `database_tables` section.
- Keep the JSON syntactically valid. Do not remove the closing fence.

## Classification Rules (Per Technical Appendix §2.3)

**Plaintext allowed** only if required for:
- Relational integrity
- Paging/querying
- Access gating (who may fetch ciphertext)
- UI topology needs

**Sovereignty rule (binding):** If the server can avoid knowing it, it must be ciphertext.

## Allowed Classifications

- `plaintext_allowed`: Operational metadata that must be plaintext for server operations
- `ciphertext_required`: User meaning/content that must never be plaintext server-side

## MACHINE SECTION
```json
{
  "version": 1,
  "api_response_fields": {
    "GET /health": {
      "ok": "plaintext_allowed",
      "service": "plaintext_allowed",
      "request_id": "plaintext_allowed"
    }
  },
  "database_tables": {
    "families": {
      "id": "plaintext_allowed",
      "created_at": "plaintext_allowed",
      "name_ciphertext": "ciphertext_required"
    },
    "profiles": {
      "id": "plaintext_allowed",
      "family_id": "plaintext_allowed",
      "is_ghost": "plaintext_allowed",
      "encrypted_profile_blob": "ciphertext_required",
      "profile_blob_version": "plaintext_allowed"
    },
    "profile_claims": {
      "profile_id": "plaintext_allowed",
      "account_id": "plaintext_allowed",
      "claimed_at": "plaintext_allowed",
      "last_seen_at": "plaintext_allowed",
      "last_seen_country_code": "plaintext_allowed",
      "last_seen_asn": "plaintext_allowed",
      "last_seen_ip_hmac": "plaintext_allowed",
      "last_seen_user_agent_hmac": "plaintext_allowed"
    },
    "relationships": {
      "id": "plaintext_allowed",
      "family_id": "plaintext_allowed",
      "parent_id": "plaintext_allowed",
      "child_id": "plaintext_allowed",
      "relationship_kind": "plaintext_allowed",
      "evidence_state": "plaintext_allowed",
      "slot_hint": "plaintext_allowed",
      "created_at": "plaintext_allowed"
    },
    "memories": {
      "id": "plaintext_allowed",
      "family_id": "plaintext_allowed",
      "owner_profile_id": "plaintext_allowed",
      "zone_anchor": "plaintext_allowed",
      "zone_focus_profile_id": "plaintext_allowed",
      "timeline_sort_key": "plaintext_allowed",
      "privacy_level": "plaintext_allowed",
      "encrypted_metadata_blob": "ciphertext_required",
      "metadata_blob_version": "plaintext_allowed",
      "created_at": "plaintext_allowed"
    },
    "memory_blobs": {
      "id": "plaintext_allowed",
      "memory_id": "plaintext_allowed",
      "storage_provider": "plaintext_allowed",
      "object_key": "plaintext_allowed",
      "ciphertext_sha256": "plaintext_allowed",
      "ciphertext_size": "plaintext_allowed",
      "mime_type": "plaintext_allowed",
      "created_at": "plaintext_allowed"
    },
    "key_envelopes": {
      "id": "plaintext_allowed",
      "family_id": "plaintext_allowed",
      "subject_profile_id": "plaintext_allowed",
      "recipient_account_id": "plaintext_allowed",
      "envelope_type": "plaintext_allowed",
      "wrapped_key": "ciphertext_required",
      "created_at": "plaintext_allowed",
      "revoked_at": "plaintext_allowed",
      "created_by_account_id": "plaintext_allowed",
      "revoked_by_account_id": "plaintext_allowed"
    },
    "blind_index_tokens": {
      "memory_id": "plaintext_allowed",
      "token": "plaintext_allowed",
      "field": "plaintext_allowed",
      "created_at": "plaintext_allowed"
    },
    "custody": {
      "child_profile_id": "plaintext_allowed",
      "custodian_profile_id": "plaintext_allowed",
      "eligible_at": "plaintext_allowed",
      "status": "plaintext_allowed",
      "created_at": "plaintext_allowed"
    },
    "ops_geo_fence_rules": {
      "id": "plaintext_allowed",
      "country_code": "plaintext_allowed",
      "action": "plaintext_allowed",
      "reason": "plaintext_allowed",
      "scope": "plaintext_allowed",
      "created_at": "plaintext_allowed",
      "updated_at": "plaintext_allowed",
      "created_by_account_id": "plaintext_allowed"
    },
    "ops_network_rules": {
      "id": "plaintext_allowed",
      "ip_cidr": "plaintext_allowed",
      "asn": "plaintext_allowed",
      "action": "plaintext_allowed",
      "reason": "plaintext_allowed",
      "created_at": "plaintext_allowed",
      "expires_at": "plaintext_allowed",
      "created_by_account_id": "plaintext_allowed"
    },
    "ops_account_activity": {
      "account_id": "plaintext_allowed",
      "first_seen_at": "plaintext_allowed",
      "last_seen_at": "plaintext_allowed",
      "last_seen_country_code": "plaintext_allowed",
      "last_seen_asn": "plaintext_allowed",
      "last_seen_ip_hmac": "plaintext_allowed",
      "last_seen_user_agent_hmac": "plaintext_allowed"
    },
    "ops_security_events": {
      "id": "plaintext_allowed",
      "occurred_at": "plaintext_allowed",
      "event_type": "plaintext_allowed",
      "action": "plaintext_allowed",
      "account_id": "plaintext_allowed",
      "ip_hmac": "plaintext_allowed",
      "country_code": "plaintext_allowed",
      "asn": "plaintext_allowed",
      "user_agent_hmac": "plaintext_allowed",
      "request_id": "plaintext_allowed",
      "endpoint_key": "plaintext_allowed",
      "http_status": "plaintext_allowed"
    },
    "ops_job_runs": {
      "id": "plaintext_allowed",
      "job_name": "plaintext_allowed",
      "status": "plaintext_allowed",
      "started_at": "plaintext_allowed",
      "finished_at": "plaintext_allowed",
      "error_summary": "plaintext_allowed",
      "rows_processed": "plaintext_allowed"
    }
  }
}
```

## Rationale By Table

### Core Tables

**families**: Family identifier and operational metadata. `name_ciphertext` stores encrypted family name.

**profiles**: Profile UUIDs and family scoping are plaintext for relational integrity. `encrypted_profile_blob` contains all human meaning (name, DOB, bio, photos, notes) and must never be decrypted server-side.

**profile_claims**: Account-to-profile binding metadata. All operational metadata for session/activity tracking. IP and User-Agent stored as HMAC only (never raw).

**relationships**: Topology endpoints (`parent_id`, `child_id`) and rendering flags (`relationship_kind`, `evidence_state`, `slot_hint`) are plaintext per §2.3 to enable deterministic solid/dotted connector rendering without decryption. Human meaning (labels/notes) must be stored encrypted in profile blobs.

**memories**: Zone/ordering/privacy metadata are plaintext for server-side paging/querying. `encrypted_metadata_blob` contains all human meaning (title, description, location, tags, event date).

**memory_blobs**: Ciphertext integrity metadata (`ciphertext_sha256`, `ciphertext_size`, `mime_type`) are plaintext for streaming and verification. Blob bytes are ciphertext-only in object storage.

**key_envelopes**: Envelope distribution metadata is plaintext for access gating. `wrapped_key` is ciphertext (DEK wrapped for recipient).

**blind_index_tokens**: Search tokens are HMAC(K_search, normalized_term). Server matches tokens without seeing plaintext search terms.

**custody**: `eligible_at` is plaintext server-enforced time lock gate per §9.1. DOB remains encrypted in profile blob; `eligible_at` is computed client-side and stored as operational gate only.

### Ops Metadata Tables (§7.3)

All ops metadata tables store operational/security data with zero-knowledge constraints:
- Raw IPs and User-Agents are ephemeral (edge logs only); long-term storage uses HMAC fingerprints only
- `endpoint_key` stores route templates only (e.g., `/profiles/:id/blob`), never full URLs with IDs
- Tables MUST NOT store profile names, emails, request payloads, vault content, or any decrypted metadata
