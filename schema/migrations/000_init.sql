-- Project LORE Schema - Initial Migration
-- Technical Appendix v9.1 §7.1 (Core Tables) + §7.3 (Ops Metadata)
-- PRODUCTION BINDING: Column names and types are binding per the Appendix

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS (Binding Names)
-- =============================================================================

-- Core enums (§7.1)
CREATE TYPE relationship_kind_enum AS ENUM ('biological', 'chosen');
CREATE TYPE evidence_state_enum AS ENUM ('verified', 'oral', 'unverified');
CREATE TYPE slot_hint_enum AS ENUM ('left', 'right', 'auto');
CREATE TYPE zone_enum AS ENUM ('origins', 'legacy', 'vault_only');
CREATE TYPE privacy_enum AS ENUM ('private', 'inner_circle', 'family');
CREATE TYPE custody_status_enum AS ENUM ('active', 'transferred', 'revoked');

-- Ops enums (§7.3)
CREATE TYPE ops_rule_action_enum AS ENUM ('allow', 'block', 'rate_limit');
CREATE TYPE ops_security_event_type_enum AS ENUM (
  'geo_fence_block',
  'ip_rule_block',
  'rate_limited',
  'auth_success',
  'auth_failure',
  'suspicious_activity',
  'access_control_change'
);
CREATE TYPE ops_job_status_enum AS ENUM ('running', 'success', 'failed');

-- =============================================================================
-- CORE TABLES (§7.1)
-- =============================================================================

-- families
CREATE TABLE families (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name_ciphertext bytea NULL
);

-- profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  is_ghost boolean NOT NULL DEFAULT true,
  encrypted_profile_blob bytea NOT NULL,
  profile_blob_version int NOT NULL DEFAULT 1
);

CREATE INDEX idx_profiles_family_id ON profiles(family_id);

-- profile_claims (with §7.3 additions)
CREATE TABLE profile_claims (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  account_id uuid NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NULL,
  last_seen_country_code char(2) NULL,
  last_seen_asn integer NULL,
  last_seen_ip_hmac bytea NULL,
  last_seen_user_agent_hmac bytea NULL
);

-- relationships
CREATE TABLE relationships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_kind relationship_kind_enum NOT NULL,
  evidence_state evidence_state_enum NOT NULL,
  slot_hint slot_hint_enum NOT NULL DEFAULT 'auto',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_relationships_no_self_loop CHECK (parent_id != child_id)
);

CREATE INDEX idx_relationships_family_id ON relationships(family_id);
CREATE INDEX idx_relationships_parent_id ON relationships(parent_id);
CREATE INDEX idx_relationships_child_id ON relationships(child_id);

-- Optional uniqueness constraint (prevent duplicate edges)
CREATE UNIQUE INDEX idx_relationships_unique_edge 
  ON relationships(parent_id, child_id, relationship_kind);

-- memories
CREATE TABLE memories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  owner_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  zone_anchor zone_enum NOT NULL,
  zone_focus_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  timeline_sort_key text NOT NULL,
  privacy_level privacy_enum NOT NULL DEFAULT 'private',
  encrypted_metadata_blob bytea NOT NULL,
  metadata_blob_version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_memories_family_id ON memories(family_id);
CREATE INDEX idx_memories_owner_profile_id ON memories(owner_profile_id);
CREATE INDEX idx_memories_zone_focus_profile_id ON memories(zone_focus_profile_id);
CREATE INDEX idx_memories_timeline_sort_key ON memories(timeline_sort_key);

-- Recommended: Unique constraint for timeline_sort_key per family
CREATE UNIQUE INDEX idx_memories_family_timeline_sort_key 
  ON memories(family_id, timeline_sort_key);

-- memory_blobs
CREATE TABLE memory_blobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id uuid NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  storage_provider text NOT NULL,
  object_key text NOT NULL,
  ciphertext_sha256 bytea NOT NULL,
  ciphertext_size bigint NOT NULL,
  mime_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_memory_blobs_memory_id ON memory_blobs(memory_id);

-- key_envelopes (with §7.3 additions)
CREATE TABLE key_envelopes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  subject_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_account_id uuid NOT NULL,
  envelope_type text NOT NULL,
  wrapped_key bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  created_by_account_id uuid NULL,
  revoked_by_account_id uuid NULL
);

CREATE INDEX idx_key_envelopes_family_id ON key_envelopes(family_id);
CREATE INDEX idx_key_envelopes_subject_profile_id ON key_envelopes(subject_profile_id);
CREATE INDEX idx_key_envelopes_recipient_account_id ON key_envelopes(recipient_account_id);

-- blind_index_tokens
CREATE TABLE blind_index_tokens (
  memory_id uuid NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  token bytea NOT NULL,
  field text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blind_index_tokens_memory_id ON blind_index_tokens(memory_id);
CREATE INDEX idx_blind_index_tokens_token ON blind_index_tokens(token);

-- custody (§9.1)
CREATE TABLE custody (
  child_profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  custodian_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  eligible_at timestamptz NOT NULL,
  status custody_status_enum NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_custody_no_self CHECK (child_profile_id != custodian_profile_id)
);

-- =============================================================================
-- OPS METADATA TABLES (§7.3)
-- =============================================================================

-- ops_geo_fence_rules
CREATE TABLE ops_geo_fence_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code char(2) NOT NULL,
  action ops_rule_action_enum NOT NULL,
  reason text NULL,
  scope text NOT NULL DEFAULT 'global',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by_account_id uuid NULL
);

CREATE UNIQUE INDEX idx_ops_geo_fence_rules_scope_country 
  ON ops_geo_fence_rules(scope, country_code);

-- ops_network_rules
CREATE TABLE ops_network_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_cidr cidr NULL,
  asn integer NULL,
  action ops_rule_action_enum NOT NULL,
  reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  created_by_account_id uuid NULL,
  CONSTRAINT chk_ops_network_rules_xor CHECK (
    (ip_cidr IS NOT NULL AND asn IS NULL) OR 
    (ip_cidr IS NULL AND asn IS NOT NULL)
  )
);

-- ops_account_activity
CREATE TABLE ops_account_activity (
  account_id uuid PRIMARY KEY,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NULL,
  last_seen_country_code char(2) NULL,
  last_seen_asn integer NULL,
  last_seen_ip_hmac bytea NULL,
  last_seen_user_agent_hmac bytea NULL
);

-- ops_security_events
CREATE TABLE ops_security_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  event_type ops_security_event_type_enum NOT NULL,
  action ops_rule_action_enum NULL,
  account_id uuid NULL,
  ip_hmac bytea NULL,
  country_code char(2) NULL,
  asn integer NULL,
  user_agent_hmac bytea NULL,
  request_id uuid NULL,
  endpoint_key text NULL,
  http_status smallint NULL
);

CREATE INDEX idx_ops_security_events_occurred_at ON ops_security_events(occurred_at);
CREATE INDEX idx_ops_security_events_account_id ON ops_security_events(account_id);
CREATE INDEX idx_ops_security_events_event_type ON ops_security_events(event_type);

-- ops_job_runs
CREATE TABLE ops_job_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name text NOT NULL,
  status ops_job_status_enum NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,
  error_summary text NULL,
  rows_processed bigint NULL
);

CREATE INDEX idx_ops_job_runs_job_name ON ops_job_runs(job_name);
CREATE INDEX idx_ops_job_runs_started_at ON ops_job_runs(started_at);

-- =============================================================================
-- NOTES
-- =============================================================================

-- Cross-family edge prevention and cycle checks are enforced at application 
-- layer + audit job per Technical Appendix §7.1

-- Retention rules per §7.3:
-- - ops_security_events: 90 days
-- - ops_job_runs: 90 days
-- - ops_account_activity: Lifetime of account
-- - ops_geo_fence_rules: Until explicitly deleted
-- - ops_network_rules: Keep expired for 12 months after expires_at, then purge

