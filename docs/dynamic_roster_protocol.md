# Dynamic Roster Protocol (DRP) — Deep Scan v0.3

> **Revision:** v1.1 (Patched 2026-01-03)

> **Purpose:** Select (A) the required **seat-functions** per Step (topology may vary) and (B) the best current **models** per function using live data — while remaining **auditable**, **stable (anti‑thrash)**, and **safe (ledger gate)**.

This document is the **Dynamic Roster Protocol (DRP)** for Project LORE’s AI Council.

---

## 1. Binding vs Dynamic

### 1.1 What is Binding

**Binding** requirements are **immutable** constraints for DRP design and for every DRP run.

Binding requirements are:

1) The **NON‑NEGOTIABLE INVARIANTS** in the DRP prompt (see **Binding Appendix**), and  
2) Any **LOCKED** rules in the provided binding sources that are explicitly cited in **Binding References**.

**Fail‑closed rule:** Any conflict or ambiguity MUST be resolved in the most restrictive safety/auditability‑preserving way and logged in the Roster Report.

### 1.2 What is Dynamic

**Dynamic** elements are any parameters, topology details, model candidate sets, thresholds (X/N/M), and tie‑break logic **not explicitly declared Binding**.

Dynamic elements MAY vary per Step, but MUST remain within Binding constraints.

### 1.3 Canonical artifacts produced by each DRP run

Each DRP run MUST produce the following artifacts (as attachments to the Decision Packet or as committed governance logs, per your governance workflow):

- `model_registry_snapshot.json` (with citations)  
- `eval_results/` (raw outputs + scoring)  
- `roster_report.md` (filled from the template in §8)  
- `roster_config.json` (machine‑readable final roster assignments)

---

## 2. Seat‑function derivation procedure (Topology Generator)

### 2.1 Purpose

Derive the minimal required **seat‑functions** for the current Step and map them onto available Council roles (Seats 1–5, Chair, Ratifier) **without hardcoding seat count or seat names**, while always preserving the mandatory functions:

- **Spec/Governance compliance check** (mandatory)  
- **Ledger/Security veto function** (mandatory)

### 2.2 Inputs

**Required inputs:**

- `step_id` (string; e.g., `"S06"`)
- `step_description` (string)
- `lane` (enum: `ENGINEERING|SECURITY|OPS|PRODUCT|LEGAL|MIXED`); if absent, treat as `MIXED`
- `protocol` (enum: `Baseline|BlindVote|OpsWorkflow`); if absent, treat as `Baseline`
- `phasing` (enum: `Single|TwoPhase|NA`); if absent or invalid, treat as `TwoPhase` (most restrictive default)
- `packet_manifest` (structured Step Packet manifest; see §2.3.1)
- `prior_roster` (optional; machine‑readable)
- `prior_roster_report` (optional)

**Packet manifest schema (required):**

```json
{
  "step_id": "SXX",
  "lane": "ENGINEERING",
  "touches_locked_rules": false,
  "touches_ledger_surfaces": ["API", "DB"],
  "adds_plaintext_fields": false,
  "adds_network_flows": false,
  "touches_crypto_or_keys": false,
  "touches_auth_or_session": false,
  "touches_ui_physics": false,
  "touches_ops_observability": false
}
```

### 2.3 Deterministic algorithm

#### 2.3.1 Risk classification (deterministic)

Compute:

- `risk_high = TRUE` when any of the following are TRUE:
  - `lane == MIXED`
  - `packet_manifest.touches_locked_rules == TRUE`
  - `packet_manifest.touches_crypto_or_keys == TRUE`
  - `packet_manifest.touches_auth_or_session == TRUE`
  - `packet_manifest.touches_ledger_surfaces` is non‑empty
  - `packet_manifest.adds_plaintext_fields == TRUE`
  - `packet_manifest.adds_network_flows == TRUE`

- `risk_low = TRUE` when all of the following are TRUE:
  - `risk_high == FALSE`
  - `packet_manifest.touches_ui_physics == FALSE`
  - `packet_manifest.touches_ops_observability == FALSE`

Else `risk_standard = TRUE`.

#### 2.3.2 Seat‑function set selection (deterministic)

Define the **function catalog** (dynamic list stored in `docs/governance/drp_function_catalog.json`).  
This protocol defines a **minimum required subset** that MUST exist in the catalog:

- `FUNC_GOV_COMPLIANCE` (mandatory)
- `FUNC_LEDGER_SECURITY` (mandatory)
- `FUNC_DOMAIN_REVIEW` (lane‑specific; mandatory)
- `FUNC_RED_TEAM` (required when `risk_high == TRUE`)
- `FUNC_PRODUCT_CONTRACT` (required when Step impacts UX / acceptance criteria or `lane in {PRODUCT, MIXED}`)
- `FUNC_IMPLEMENTATION_REALISM` (required when Step proposes code patches or schema changes)
- `FUNC_CHAIR_SYNTHESIS` (required when `protocol == Baseline`)
- `FUNC_RATIFICATION` (required when `protocol == Baseline`)

**Algorithm (pseudocode):**

```text
INPUT: packet_manifest, lane, protocol, risk flags
OUTPUT: topology = { functions[], role_slots[] }

functions := empty set

// Mandatory invariants
ADD functions += FUNC_GOV_COMPLIANCE
ADD functions += FUNC_LEDGER_SECURITY

// Always include lane-specific domain review
ADD functions += FUNC_DOMAIN_REVIEW[lane]

// Add implementation realism whenever step produces patches or schema/API changes
WHEN packet_manifest.touches_ledger_surfaces not empty OR packet_manifest.touches_ui_physics == TRUE OR lane in {ENGINEERING, MIXED, SECURITY}:
  ADD functions += FUNC_IMPLEMENTATION_REALISM

// Add product contract seat when UX acceptance criteria are in scope
WHEN lane in {PRODUCT, MIXED}:
  ADD functions += FUNC_PRODUCT_CONTRACT

// Add red-team seat for high-risk
WHEN risk_high == TRUE:
  ADD functions += FUNC_RED_TEAM

// Chair + Ratifier roles for Baseline protocol
WHEN protocol == Baseline:
  ADD functions += FUNC_CHAIR_SYNTHESIS
  ADD functions += FUNC_RATIFICATION

// Decide role_slots mapping
role_slots := assign_roles(functions, risk flags, protocol)

RETURN topology
```

#### 2.3.3 Role slot mapping (deterministic)

Role slots are drawn from:

- Seats: `Seat1..Seat5`
- `Chair`
- `Ratifier`

**Default mapping rules (deterministic):**

1) `FUNC_CHAIR_SYNTHESIS` → `Chair`  
2) `FUNC_RATIFICATION` → `Ratifier`  
3) `FUNC_GOV_COMPLIANCE` → first available Seat in ascending order (`Seat1..Seat5`)  
4) `FUNC_LEDGER_SECURITY` → next available Seat in ascending order (`Seat1..Seat5`)  
5) `FUNC_DOMAIN_REVIEW` → next available Seat  
6) Remaining functions in ascending `function_id` order → next available Seat  

**Capacity rule:**

- If required functions exceed available role slots, the Topology Generator MUST output:
  - `INVALID: INSUFFICIENT ROLE SLOTS FOR REQUIRED FUNCTIONS`
  - and MUST STOP.

**Mandatory separation rule (FAIL‑CLOSED):**

- `FUNC_GOV_COMPLIANCE` and `FUNC_LEDGER_SECURITY` MUST be mapped to **different role slots**.

### 2.4 Outputs

Topology Generator MUST output:

```json
{
  "step_id": "SXX",
  "risk_level": "low|standard|high",
  "functions": [
    {"function_id": "FUNC_GOV_COMPLIANCE", "role_slot": "Seat2"},
    {"function_id": "FUNC_LEDGER_SECURITY", "role_slot": "Seat4"},
    ...
  ]
}
```

### 2.5 Fail‑closed rules

- If `lane` is missing, treat as `MIXED` (most restrictive).
- If packet manifest fields are missing, treat missing booleans as `TRUE` and missing lists as `["UNKNOWN"]`.
- If the topology omits `FUNC_GOV_COMPLIANCE` or `FUNC_LEDGER_SECURITY`, the run MUST be marked INVALID and MUST STOP.

---

## 3. Model Registry Update procedure (no hardcoded model list)

### 3.1 Purpose

Discover the current set of candidate models each run and produce an auditable `model_registry_snapshot.json` with required fields and citations.

### 3.2 Inputs

- `provider_registry` (list of provider entries; each entry includes provider name + official domains/endpoints)
- `source_registry` (allowed sources; §3.4)
- `retrieved_at_utc` (timestamp; required)
- `registry_run_id` (unique string; required)

### 3.3 Required output fields (per model)

Each model entry MUST include:

- `provider` (vendor company; e.g., `"OpenAI"`)
- `model_id` (provider’s canonical id)
- `release_date` (ISO date) OR `MISSING`
- `pricing`:
  - `input_cost_per_1M_tokens_usd` OR `tier_pricing_notes` OR `MISSING`
  - `output_cost_per_1M_tokens_usd` OR `tier_pricing_notes` OR `MISSING`
- `latency_notes` OR `MISSING`
- `context_limit_tokens` OR `MISSING`
- `deprecation_status` (`active|deprecated|unknown`)
- `citations` (list; each citation references a source + retrieval timestamp + evidence snippet)

### 3.4 Source vetting + adoption control (model registry sources)

#### 3.4.1 Source registry schema

```json
{
  "source_id": "SRC_OPENAI_PRICING",
  "source_type": "official_provider|benchmark|third_party_analysis",
  "status": "RATIFIED|CANDIDATE|BANNED",
  "domains_allowlist": ["openai.com"],
  "added_by": "CouncilDecision:ID-XXXX",
  "added_at": "YYYY-MM-DD",
  "notes": "..."
}
```

#### 3.4.2 Allowed sources rubric (deterministic)

- For **provider/model identity, release notes, context limits, and pricing**:
  - `source_type` MUST be `official_provider`
  - `status` MUST be `RATIFIED` or `CANDIDATE`
- For **external performance priors**:
  - `source_type` MUST be `benchmark`
  - `status` MUST be `RATIFIED` or `CANDIDATE`

**Adoption control rule:**

- A source with status `CANDIDATE` MUST be included in the Roster Report as `CANDIDATE` and MUST have **weight = 0** in any scoring that can change incumbents.
- A source MUST transition `CANDIDATE → RATIFIED` only via a Council Baseline decision that records:
  - why it is reliable,
  - how it is measured,
  - how it maps to internal evals,
  - and its failure modes.

### 3.5 Deterministic algorithm

**Algorithm (pseudocode):**

```text
INPUT: provider_registry, source_registry, retrieved_at_utc
OUTPUT: model_registry_snapshot

models := empty list

FOR EACH provider in provider_registry SORTED BY provider.provider_id:
  sources := all sources in source_registry where provider.domain in sources.domains_allowlist
  FETCH each RATIFIED or CANDIDATE source (store raw content + sha256)
  PARSE model entries from raw content using provider-specific parser versioned in code
  FOR EACH parsed model:
    NORMALIZE fields into required schema
    ATTACH citations referencing exact source + retrieved_at_utc + evidence snippet
    APPEND model to models

SORT models by (provider, model_id)
registry_hash := sha256(canonical_json(models))
RETURN {retrieved_at_utc, models, registry_hash, raw_sources_index}
```

**Determinism note:** Parsing MUST be deterministic given the same raw source content.

### 3.6 Fail‑closed rules

- If no `RATIFIED` official source exists for a provider, all models from that provider MUST be excluded.
- If required fields cannot be parsed, those fields MUST be `MISSING` (do not infer).
- If all cost fields for a model are `MISSING`, cost MUST NOT be used as a tie‑breaker for that model.

---

## 4. Evaluation pipeline (internal evals anchor + external priors)

### 4.1 Purpose

Produce normalized, uncertainty‑aware scores per (seat‑function, model) using:

- **Internal eval packs** as the anchor (required)
- **External priors** as supporting information only

### 4.2 Inputs

- `topology` (from §2)
- `model_registry_snapshot` (from §3)
- `internal_eval_packs` (specs in §4.4; actual instances in `eval_packs/`)
- `eval_run_config`:
  - deterministic generation settings (temperature=0, top_p=1, etc.)
  - retry policy (fixed)
  - run count per item (fixed)
- `external_priors` (optional; from RATIFIED/CANDIDATE sources)
- `prior_roster` + `prior_eval_history` (rolling window data)

### 4.3 Outputs

- `eval_results.json` (raw + aggregate)
- `normalized_scores.json` (0–100 scale + uncertainty)
- `missing_metrics.json`
- `eval_run_manifest.json` (inputs + hashes + timestamps)

### 4.4 Minimal internal eval pack specs (per seat‑function)

All eval packs MUST satisfy:

- **Min items:** 10 (target 10–30)
- **Deterministic scoring:** given the same model outputs, scoring MUST return identical results
- **I/O schema:** each item uses the same JSON schema for that pack

#### 4.4.1 Shared eval item schema (all packs)

```json
{
  "case_id": "string",
  "function_id": "FUNC_*",
  "input": {
    "step_id": "SXX",
    "packet_excerpt": "string",
    "attachments_index": ["string"],
    "prior_roster_excerpt": "string"
  },
  "expected": {
    "checks": ["string"],
    "verdict": "APPROVE|REJECT|MODIFY|N/A",
    "must_cite": true
  }
}
```

#### 4.4.2 Pack: Spec/Governance compliance (FUNC_GOV_COMPLIANCE)

**Task types (coverage):**
- Detect missing required packet fields (contract completeness)
- Detect violations of binding/LOCKED rules when quoted
- Enforce citation discipline: any LOCKED/Ledger claim must include (doc + section + ≤25‑word quote) or be marked UNPROVEN
- Verify outputs contain mandatory fields (verdict, audit pass, required changes)

**Output schema (model):**
```json
{
  "verdict": "APPROVE|REJECT|MODIFY",
  "audit_pass": true,
  "binding_violations": [{"doc":"...","section":"...","quote":"...","where":"..."}],
  "missing_packet_items": ["..."],
  "required_changes": ["..."]
}
```

**Scoring rubric (0–100):**
- 40 pts: correct verdict vs expected
- 25 pts: identifies all required missing packet items (precision/recall scored)
- 25 pts: correct binding violation detection with citations (exact‑match on doc+section; quote length check)
- 10 pts: output schema validity (JSON parse + required fields)

**Deterministic scoring method:**
- Implement `score_gov_compliance.py`:
  - JSON parse
  - compute F1 for missing items
  - validate citation objects (≤25 words)
  - compute weighted sum

**Fail‑closed:** If JSON invalid or required fields missing, score = 0 for that item.

#### 4.4.3 Pack: Ledger/Security (FUNC_LEDGER_SECURITY)

**Task types (coverage):**
- Field classification decisions for DB/API/auth/log/cache changes
- Detect plaintext leakage risks (names/DOB/notes/keys/media)
- Validate that a provided Ledger Field Matrix is complete for touched surfaces
- Enforce that deterministic Ledger Surface Scanner failures cannot be overridden

**Output schema:**
```json
{
  "ledger_findings": [
    {
      "surface": "DB|API|AUTH|SESSION|LOG|ANALYTICS|CLIENT_CACHE|OBJECT_STORAGE",
      "field": "string",
      "proposed_classification": "PLAINTEXT|CIPHERTEXT",
      "rationale": "string",
      "requires_scanner_fail": true
    }
  ],
  "verdict_recommendation": "PASS|FAIL",
  "required_evidence": ["packet_sniff|schema_diff|field_matrix|..."]
}
```

**Scoring rubric (0–100):**
- 50 pts: correct classification vs expected (exact match on fields)
- 30 pts: correctly triggers FAIL when expected
- 20 pts: identifies missing evidence/artifacts

**Deterministic scoring method:**
- Implement `score_ledger_security.py`:
  - match findings by (surface, field)
  - exact‑match classification
  - verify FAIL triggers
  - schema validity checks

**Fail‑closed:** Any missing required output fields ⇒ item score = 0.

#### 4.4.4 Pack: Domain review (FUNC_DOMAIN_REVIEW[LANE])

Define one domain pack per lane. Minimum required lane packs:

- `FUNC_DOMAIN_REVIEW_ENGINEERING`
- `FUNC_DOMAIN_REVIEW_SECURITY`
- `FUNC_DOMAIN_REVIEW_OPS`
- `FUNC_DOMAIN_REVIEW_PRODUCT`
- `FUNC_DOMAIN_REVIEW_LEGAL`
- `FUNC_DOMAIN_REVIEW_MIXED`

**Task types (coverage):**
- Identify correctness holes and propose minimal fixes
- Identify test gaps and propose required tests
- Identify scope creep vs packet scope
- Lane‑appropriate red‑team (1–3 failure modes)

**Output schema:**
```json
{
  "verdict": "APPROVE|REJECT|MODIFY",
  "risks": ["..."],
  "required_changes": ["..."],
  "test_changes": ["..."]
}
```

**Scoring:** Similar to governance pack, but lane‑specific expected lists.

#### 4.4.5 Pack: Chair synthesis (FUNC_CHAIR_SYNTHESIS)

**Task types:**
- Synthesize multiple seat votes into one ruling
- Choose ONE final patch (“USE CANDIDATE” vs “SEE BELOW”)
- Preserve citation discipline
- Produce Decisions.md entry

**Output schema:** matches Chair template fields.

**Scoring:** exact‑match on required fields presence + correctness of chosen option where expected.

#### 4.4.6 Pack: Ratification (FUNC_RATIFICATION)

**Task types:**
- Verify Chair ruling matches contract and votes
- Perform ledger/LOCKED verification and dissent when required
- Bug hunt minimal required fix

**Output schema:** ratifier fields.

**Scoring:** correctness of ratify vs dissent + required fix completeness.

### 4.5 External priors (supporting only)

External priors MUST be stored separately as `external_priors.json` with:

- source id + status (RATIFIED/CANDIDATE)
- timestamp
- metric name and value
- mapping to seat‑function (if any)

**Rule:** External priors MUST NOT cause an incumbent upgrade when internal eval data is MISSING or conflicting.

### 4.6 Normalization + uncertainty (deterministic)

For each (function_id, model_id):

- Compute `mean_item_score` and `stdev_item_score` across items.
- Compute `standard_error = stdev / sqrt(n_items)`.
- Define `quality_lcb = mean - 1.0 * standard_error` (z=1.0 default; dynamic).
- Normalize to 0–100:
  - `normalized_quality = clamp(quality_lcb, 0, 100)`.

**Fail‑closed:**
- If `n_items < 10`, mark `internal_eval = MISSING` for that function/model.

### 4.7 Deterministic evaluation algorithm (pseudocode)

**Procedure name:** `EVAL_PIPELINE_RUN`

**Inputs (required):**
- `topology.json`
- `model_registry_snapshot.json`
- `internal_eval_packs/` (per §4.4)
- `eval_run_config.json` (deterministic settings + retry policy)
- `prior_eval_history.json` (optional; rolling window)

**Outputs:**
- `eval_run_manifest.json`
- `eval_results.json` (raw + per-item scores)
- `normalized_scores.json`
- `missing_metrics.json`

**Algorithm (deterministic given recorded raw outputs):**

```text
INPUT: topology, model_registry_snapshot, internal_eval_packs, eval_run_config, prior_eval_history
OUTPUT: eval_run_manifest, eval_results, normalized_scores, missing_metrics

1) VALIDATE PACKS
   FOR each function_id in topology.functions:
     IF no internal_eval_pack exists for function_id:
        missing_metrics[function_id] := "MISSING_PACK"
        CONTINUE

2) BUILD CANDIDATE SETS
   models := all models where deprecation_status != "deprecated"
   SORT models by (provider, model_id)

   FOR each function_id:
     candidates[function_id] := models filtered by capability requirements (context, tooling)

3) RUN MODELS (DATA COLLECTION)
   FOR each function_id in ascending order:
     pack := internal_eval_pack[function_id]
     SORT pack.items by case_id

     FOR each model in candidates[function_id]:
       IF pack.items.count < 10:
          missing_metrics[(function_id, model)] := "INSUFFICIENT_ITEMS"
          CONTINUE

       FOR each case in pack.items:
         prompt := render_prompt(case)  // deterministic template
         params := eval_run_config.generation_params  // temperature=0, top_p=1, etc.
         output := call_model(provider=model.provider, model_id=model.model_id, prompt, params)
         STORE raw_output with sha256(output)

       SCORE all raw_outputs for (function_id, model) using deterministic scoring script for that pack
       STORE per-item scores in eval_results

4) AGGREGATE + NORMALIZE
   FOR each (function_id, model) with scores:
     mean := average(item_scores)
     stdev := stdev(item_scores)
     n := count(item_scores)
     se := stdev / sqrt(n)
     lcb := mean - 1.0 * se
     normalized_quality := clamp(lcb, 0, 100)
     WRITE normalized_scores[(function_id, model)] := {mean, stdev, n, lcb, normalized_quality}

5) WRITE MANIFEST
   eval_run_manifest MUST include:
     - hashes of all inputs
     - hashes of raw outputs
     - timestamps
     - exact scoring script hashes
```

**Fail‑closed rules:**
- If any model call fails for any case, the pipeline MUST mark that (function_id, model) metric as MISSING and MUST NOT infer a replacement score.
- If any scoring script hash is missing, the pipeline MUST FAIL the run.
- If a pack has fewer than 10 items, the pipeline MUST mark that pack as MISSING for all candidates.

---

## 5. ROI scoring + upgrade/retire logic (safety hard gates)

### 5.1 Purpose

Rank candidates for each seat‑function with **safety/assurance as hard gates**, then use **cost and latency only as tie‑breakers** among fully‑compliant candidates.

### 5.2 Inputs

- `normalized_scores` (from §4)
- `model_registry_snapshot` (from §3)
- `gate_results` (from §10 scanner + other gates)
- `stability_state` (from §7)

### 5.3 Hard gates (infinite weight)

A candidate model MUST be considered **INELIGIBLE** for selection for a function when any gate fails:

- **GATE‑EVAL:** internal eval for (function, model) is MISSING or conflicting (except when retaining incumbent)
- **GATE‑SOURCE:** model registry fields used in tie‑break (pricing/latency) are based only on CANDIDATE sources
- **GATE‑POLICY:** provider/model is disallowed by Provider Registry policy (e.g., unratified provider)
- **GATE‑DIVERSITY:** violates diversity constraints for critical seats (see §6)

**Rule:** If any proposal would reduce safety/assurance constraints due to cost, the run MUST output:  
`REQUIRES ARCHITECT + PRODUCT APPROVAL` and MUST STOP.

### 5.4 ROI ranking key (deterministic; tie‑break only)

For each function, define the ranking key:

1) Higher `normalized_quality` wins.
2) Within `TIE_BAND` of the best score (dynamic default: 0.5 points), lower `blended_cost_per_1M_tokens` wins.
3) If still tied, lower `p50_latency_ms` wins.
4) If still tied, stable tie‑break: lexicographic `(provider, model_id)`.

**Blended cost calculation (deterministic):**

`blended_cost = (input_cost * INPUT_WEIGHT) + (output_cost * OUTPUT_WEIGHT)`

Default dynamic weights: `INPUT_WEIGHT=0.5`, `OUTPUT_WEIGHT=0.5`.

If any required cost field is MISSING, that candidate MUST NOT be selected via cost tie‑break; proceed to next tie‑break.

### 5.5 Retire logic (deterministic)

A model MUST be retired from the registry (marked `deprecated`) when:

- Provider marks it deprecated, OR
- It fails internal eval regression threshold for `R` consecutive eval windows (dynamic), OR
- It becomes ineligible due to policy or missing sources.

Retirement MUST NOT delete historical entries; it MUST only change `deprecation_status` and record the reason.

---

## 6. Seat assignment algorithm + diversity constraints

### 6.1 Purpose

Assign a specific model to each seat‑function for the current Step while enforcing independence and diversity constraints and stability rules.

### 6.2 Inputs

- `topology` (from §2)
- `model_registry_snapshot` (from §3)
- `normalized_scores` + `missing_metrics` (from §4)
- `prior_roster` + `prior_roster_report` (optional)
- `stability_params` (from §7)

### 6.3 Mandatory diversity constraints (binding)

- **Independence constraint:** `FUNC_GOV_COMPLIANCE` and `FUNC_LEDGER_SECURITY` MUST be assigned to **different providers** (vendor companies).
- **No waiver for cost:** cost cannot waive independence/diversity; waiver requires `REQUIRES ARCHITECT + PRODUCT APPROVAL` and STOP.

### 6.4 Deterministic assignment order

Assign functions in this order:

1) `FUNC_GOV_COMPLIANCE`
2) `FUNC_LEDGER_SECURITY`
3) all remaining functions sorted by `function_id`

### 6.5 Deterministic seat assignment algorithm

**Algorithm (pseudocode):**

```text
INPUT: topology.functions, candidates_by_function, prior_roster, stability_state
OUTPUT: assignments

assignments := empty map

FOR function_id in assignment_order:
  role_slot := topology[function_id].role_slot
  incumbent := prior_roster[role_slot] if exists else null

  candidates := build_candidates(function_id)  // filtered by registry + eval gates

  // Enforce independence for critical pair
  IF function_id == FUNC_LEDGER_SECURITY:
     REMOVE from candidates any model where provider == provider(assignments[FUNC_GOV_COMPLIANCE])

  // Stability decision
  chosen := choose_with_stability(function_id, incumbent, candidates, stability_state)

  IF chosen == null:
     IF function_id in {FUNC_GOV_COMPLIANCE, FUNC_LEDGER_SECURITY}:
        OUTPUT "INSUFFICIENT INDEPENDENCE — REQUIRES ARCHITECT + PRODUCT APPROVAL" and STOP
     ELSE:
        OUTPUT "INVALID: NO ELIGIBLE CANDIDATE FOR " + function_id and STOP

  assignments[role_slot] := chosen

RETURN assignments
```

**Candidate builder (deterministic):**

A model is included in `candidates` when:

- `deprecation_status != deprecated`
- provider has at least one `RATIFIED` official source
- internal eval exists for (function, model) OR model is the incumbent for that function
- any required capabilities for the function are satisfied (e.g., context window)

**Stability chooser (deterministic):**

See §7.3 for `choose_with_stability`.

### 6.6 Fail‑closed rules

- If independence cannot be satisfied, the run MUST STOP with the required message.
- If metrics are missing or conflicting, the chooser MUST keep the incumbent and log the reason (or bootstrap if no incumbent; §7.4).

---

## 7. Stability policy (anti‑thrash)

### 7.1 Purpose

Prevent model thrash while still allowing upgrades when evidence is strong.

### 7.2 Parameters (dynamic defaults)

- `HYSTERESIS_X_PERCENT = 3%`
- `ROLLING_WINDOW_K = 3` (runs)
- `MIN_TENURE_STEPS = 2`
- `MIN_TENURE_DAYS = 14`
- `REGRESSION_Y_PERCENT = 5%`
- `ROLLBACK_CONFIRM_RUNS = 1`

All parameters are **Dynamic** unless a binding source later locks them.

### 7.3 Deterministic stability algorithm

#### 7.3.1 Data model

Maintain `stability_state.json`:

```json
{
  "role_slot": "Seat2",
  "incumbent_model": {"provider":"...","model_id":"..."},
  "incumbent_since_step": "SXX",
  "incumbent_since_date": "YYYY-MM-DD",
  "rolling_history": [
    {"run_id":"...","date":"...","normalized_quality": 87.2}
  ],
  "last_known_good": {"provider":"...","model_id":"..."}
}
```

#### 7.3.2 Choose-with-stability (pseudocode)

```text
FUNCTION choose_with_stability(function_id, incumbent, candidates, stability_state):

  IF incumbent is null:
     RETURN bootstrap_select(function_id, candidates)

  // Incumbent may NOT be retained if it fails any hard gate (policy/diversity/independence/etc.)
  // i.e., if it is not present in the already-filtered eligible candidate set.
  IF incumbent not in candidates:
     IF candidates is empty:
        RETURN null
     ELSE:
        RETURN top_ranked(candidates)

  // Missing metrics => keep incumbent
  IF metrics_missing_or_conflicting(function_id, candidates):
     RETURN incumbent

  // Tenure gate
  IF tenure(incumbent) < MIN_TENURE_STEPS OR tenure_days(incumbent) < MIN_TENURE_DAYS:
     RETURN incumbent

  challenger := top_ranked(candidates)

  // Hysteresis gate using rolling window LCB
  inc_score := rolling_lcb(incumbent, ROLLING_WINDOW_K)
  ch_score  := rolling_lcb(challenger, ROLLING_WINDOW_K)

  IF ch_score >= inc_score * (1 + HYSTERESIS_X_PERCENT):
     RETURN challenger
  ELSE:
     RETURN incumbent
```

#### 7.3.3 Rollback rule (deterministic)

After any upgrade:

- Monitor `ROLLBACK_CONFIRM_RUNS` eval runs.
- If the new model’s rolling LCB drops below `(previous_incumbent_LCB * (1 - REGRESSION_Y_PERCENT))`,
  then rollback to `last_known_good`.

### 7.4 Bootstrap (Genesis) process (no incumbent)

Bootstrap selection MUST:

1) Use only internal eval anchor packs (no external priors for decisive ranking).
2) Apply all hard gates and diversity constraints.
3) Select the top‑ranked candidate per function.
4) Require explicit human ratification of the initial roster.
5) Record the ratified roster as incumbents for tenure/hysteresis.

If no candidate has internal eval results for a required function, bootstrap MUST STOP and require Architect + Product approval.

---

## 8. Roster Report template (mandatory per run)

> **Fail‑closed:** If the full Roster Report is not produced with every mandatory field populated (or explicitly marked MISSING where allowed), the DRP run is INVALID.

### 8.1 Template

```md
# DRP Roster Report — {RUN_ID}

## A. Run Metadata (MANDATORY)
- run_id: {RUN_ID}
- generated_at_utc: {YYYY-MM-DDTHH:MM:SSZ}
- step_id: {STEP_ID}
- step_description: {STEP_DESCRIPTION}
- lane: {LANE}
- protocol: {Baseline|BlindVote|OpsWorkflow}
- phasing: {Single|TwoPhase|NA}
- prior_roster_ref: {link or MISSING}
- prior_roster_report_ref: {link or MISSING}

## B. Binding Sources In Play (MANDATORY)
List every binding source actually used this run.
- source: {doc name}
- sections_used: {section headings}
- notes: {why used}

## C. Source Registry Snapshot (MANDATORY)
- sources_used:
  - source_id: ...
    status: RATIFIED|CANDIDATE
    retrieved_at_utc: ...
    evidence_ref: {url/file path}
    content_hash_sha256: ...
- source_vetting_decisions: {none or list}

## D. Model Registry Snapshot (MANDATORY)
- registry_run_id: ...
- retrieved_at_utc: ...
- registry_hash: ...
- models_count: ...
- missing_fields_summary: {field -> count}
- registry_file_ref: {path/link}

## E. Topology Generator Output (MANDATORY)
- packet_manifest_ref: {path/link}
- derived_risk_level: low|standard|high
- functions_and_role_slots:
  - function_id: ...
    role_slot: ...
    rationale: ...

## F. Eval Pipeline Evidence (MANDATORY)
- eval_run_id: ...
- eval_run_config_hash: ...
- internal_eval_packs_used:
  - function_id: ...
    pack_version: ...
    n_items: ...
- external_priors_used:
  - source_id: ...
    status: RATIFIED|CANDIDATE
    metric: ...
    value: ...
    weight_applied: {0 if CANDIDATE}
- raw_eval_outputs_ref: {path/link}
- scoring_scripts_ref: {path/link + hash}

## G. Normalized Scores + Uncertainty (MANDATORY)
Provide per (function, model) summary for finalists and incumbents.
- function_id: ...
  candidates:
    - provider: ...
      model_id: ...
      mean_score: ...
      stdev: ...
      n_items: ...
      quality_lcb: ...
      normalized_quality: ...
      missing_metrics: {none or list}

## H. ROI Math (MANDATORY; AUTO-CALCULATED)
For each finalist candidate:
- function_id: ...
  provider: ...
  model_id: ...
  gate_pass: true|false
  gates_failed: [ ... ]
  normalized_quality: ...
  tie_band: {value}
  input_cost_per_1M_tokens_usd: {value or MISSING}
  output_cost_per_1M_tokens_usd: {value or MISSING}
  blended_cost_per_1M_tokens_usd: {AUTO}
  p50_latency_ms: {value or MISSING}
  roi_rank_key: {AUTO: [quality, cost, latency, provider/model_id]}
  selection_decision: {kept_incumbent|upgraded|bootstrapped}
  stability_checks:
    tenure_steps: ...
    tenure_days: ...
    incumbent_lcb: ...
    challenger_lcb: ...
    hysteresis_threshold: ...
    hysteresis_pass: true|false

## I. Final Seat Assignments (MANDATORY)
- role_slot: ...
  function_id: ...
  provider: ...
  model_id: ...
  reason: ...
  changes_from_prior: {none or describe}

## J. Missing / Uncertain Metrics (MANDATORY)
- item: ...
  reason: ...
  impact: {kept incumbent / blocked upgrade / reduced confidence}

## K. Change Log (MANDATORY)
- previous_roster: {summary}
- new_roster: {summary}
- changes:
  - role_slot: ...
    from: ...
    to: ...
    reason: ...
    risk_notes: ...

## L. Fail-Closed Decisions (MANDATORY)
List every time the run defaulted to restrictive interpretation.
- case: ...
  decision: ...
  rationale: ...

## M. Human Ratification (MANDATORY when bootstrap or any upgrade)
- required: true|false
- ratified_by: {name or MISSING}
- ratified_at: {timestamp or MISSING}
- notes: {...}

## N. Attachments Index (MANDATORY)
- {file}: {hash} — {description}
```

---

## 9. “Roster Generator” meta‑prompt (reusable)

Use this meta‑prompt to generate a roster for a specific Step.

```text
SYSTEM: You are the DRP Roster Generator. You MUST follow Binding Invariants and FAIL-CLOSED rules.

INPUT PLACEHOLDERS (MANDATORY):
- STEP_ID: {STEP_ID}
- STEP_DESCRIPTION: {STEP_DESCRIPTION}
- BINDING_INVARIANTS: {PASTE Binding Appendix: NON-NEGOTIABLE INVARIANTS}
- BINDING_REFERENCES: {PASTE Binding References section from DRP}
- PRIOR_ROSTER: {JSON or "NONE"}
- PRIOR_ROSTER_REPORT: {text or "NONE"}
- MODEL_REGISTRY_SNAPSHOT: {model_registry_snapshot.json}
- SOURCE_REGISTRY_SNAPSHOT: {source_registry.json}
- TOPOLOGY_MANIFEST: {packet_manifest.json}
- INTERNAL_EVAL_RESULTS: {normalized_scores.json + eval_results.json}
- EXTERNAL_PRIORS: {external_priors.json or "NONE"}
- STABILITY_STATE: {stability_state.json or "NONE"}

YOUR TASK (MANDATORY):
1) Run the Topology Generator algorithm and output the derived functions + role slots.
2) Run the Seat Assignment algorithm with diversity + stability constraints.
3) AUTO-CALCULATE ALL ROI MATH FIELDS in the Roster Report:
   - blended_cost_per_1M_tokens_usd
   - roi_rank_key
   - tenure_steps / tenure_days
   - incumbent_lcb / challenger_lcb
   - hysteresis_threshold / hysteresis_pass
4) Output the FULL Roster Report using the exact template in DRP §8, populating every mandatory field.
   - If any required info is unavailable, mark it MISSING and apply fail-closed stability rules (keep incumbent or bootstrap halt).
5) If independence between Governance and Ledger/Security cannot be satisfied, output:
   INSUFFICIENT INDEPENDENCE — REQUIRES ARCHITECT + PRODUCT APPROVAL
   and STOP.

OUTPUT FORMAT (STRICT):
- You MUST output ONLY the filled Roster Report markdown.
- You MUST NOT include extra commentary outside the report.
```

---

## 10. Ledger Surface Scanner Specification (deterministic; imperative-only)

### 10.1 Scope

- The Ledger Surface Scanner MUST run as a deterministic gate on every Step that touches any Ledger surface.
- The Ledger Surface Scanner MUST scan the following Ledger surfaces:
  - DB schema and stored fields
  - API request payload fields
  - API response payload fields
  - auth/session fields (cookies, tokens, session DB rows)
  - log lines (application logs, access logs, error logs)
  - analytics events (client and server)
  - client cache/persistence (local storage, indexed storage, file caches)
  - object storage operational metadata (object keys, headers, tags, sizes, hashes)
- The Ledger Surface Scanner MUST treat the Ledger/Security seat output as advisory only.
- The Ledger Surface Scanner MUST treat a FAIL result as a non‑overridable veto.
- The Ledger Surface Scanner MUST produce identical outputs given identical inputs.

### 10.2 Inputs

- The Ledger Surface Scanner MUST take `ledger_surface_manifest.json` as input.
- The Ledger Surface Scanner MUST take `ledger_plaintext_allowlist.json` as input.
- The Ledger Surface Scanner MUST take `repo_ledger_extract.json` as input.
- The Ledger Surface Scanner MUST take `binding_classification_refs.json` as input.
- The Ledger Surface Scanner MUST FAIL when any required input is missing.

#### 10.2.1 `ledger_surface_manifest.json` schema

- The manifest MUST enumerate every touched surface and every new or changed field/event.
- The manifest MUST use this schema:

```json
{
  "step_id": "SXX",
  "surfaces_touched": [
    {
      "surface": "DB|API_REQUEST|API_RESPONSE|AUTH|SESSION|LOG|ANALYTICS|CLIENT_CACHE|OBJECT_STORAGE",
      "items": [
        {
          "path": "string",
          "change_type": "ADD|MODIFY|REMOVE",
          "declared_classification": "PLAINTEXT|CIPHERTEXT",
          "justification": "string",
          "evidence_refs": ["string"]
        }
      ]
    }
  ]
}
```

- The manifest MUST FAIL validation when any `declared_classification` is missing.

#### 10.2.2 `ledger_plaintext_allowlist.json` schema

- The allowlist MUST enumerate every plaintext‑allowed path for each surface.
- The allowlist MUST use this schema:

```json
{
  "version": "YYYY-MM-DD",
  "allowlist": [
    {
      "surface": "DB|API_REQUEST|API_RESPONSE|AUTH|SESSION|LOG|ANALYTICS|CLIENT_CACHE|OBJECT_STORAGE",
      "paths": ["string"]
    }
  ]
}
```

#### 10.2.3 `repo_ledger_extract.json` schema

- The repo extract MUST enumerate every surfaced field/event detected by deterministic scanning of the diff.
- The repo extract MUST use this schema:

```json
{
  "commit_or_patch_id": "string",
  "extracted": [
    {
      "surface": "DB|API_REQUEST|API_RESPONSE|AUTH|SESSION|LOG|ANALYTICS|CLIENT_CACHE|OBJECT_STORAGE",
      "path": "string",
      "change_type": "ADD|MODIFY|REMOVE"
    }
  ]
}
```

#### 10.2.4 `binding_classification_refs.json` schema

- The binding refs MUST identify the binding classification rules used by the scanner.
- The binding refs MUST include references to Appendix §2.1–§2.3.
- The binding refs MUST use this schema:

```json
{
  "classification_sources": [
    {
      "doc": "string",
      "section": "string",
      "quote": "string"
    }
  ]
}
```

### 10.3 Deterministic extraction requirements

- The Ledger Surface Scanner MUST FAIL when `repo_ledger_extract.json.extracted` is empty and `ledger_surface_manifest.json.surfaces_touched` is non‑empty.
- The Ledger Surface Scanner MUST FAIL when any `(surface, path, change_type)` in `repo_ledger_extract.json` is not present in `ledger_surface_manifest.json`.
- The Ledger Surface Scanner MUST FAIL when any `(surface, path, change_type)` in `ledger_surface_manifest.json` is not present in `repo_ledger_extract.json`.

### 10.4 Classification logic (§2.1–§2.3 mapping)

- The Ledger Surface Scanner MUST classify every manifest item as `PLAINTEXT_ALLOWED` or `CIPHERTEXT_REQUIRED`.
- The Ledger Surface Scanner MUST treat every `(surface, path)` not present in `ledger_plaintext_allowlist.json` as `CIPHERTEXT_REQUIRED`.
- The Ledger Surface Scanner MUST treat every `(surface, path)` present in `ledger_plaintext_allowlist.json` as `PLAINTEXT_ALLOWED`.

- The Ledger Surface Scanner MUST FAIL when any manifest item has `declared_classification == PLAINTEXT` and the computed classification is `CIPHERTEXT_REQUIRED`.
- The Ledger Surface Scanner MUST FAIL when any manifest item has `declared_classification == CIPHERTEXT` and the computed classification is `PLAINTEXT_ALLOWED` and the justification does not state why plaintext is required.

- The Ledger Surface Scanner MUST FAIL when any manifest item path indicates profile human meaning fields stored as plaintext.
- The Ledger Surface Scanner MUST FAIL when any manifest item path indicates memory payload bytes, transcripts, story text, or per‑item metadata stored as plaintext.
- The Ledger Surface Scanner MUST FAIL when any manifest item path indicates key material stored or transmitted unencrypted.

- The Ledger Surface Scanner MUST FAIL when any manifest item justification conflicts with the sovereignty rule.
- The Ledger Surface Scanner MUST FAIL when any manifest item justification contains an empty string.

### 10.5 Outputs

- The Ledger Surface Scanner MUST output `ledger_surface_scanner_result.json`.
- The output MUST use this schema:

```json
{
  "status": "PASS|FAIL",
  "failures": [
    {
      "code": "MISSING_INPUT|SCHEMA_INVALID|EXTRACT_MISMATCH|PLAINTEXT_NOT_ALLOWED|SOVEREIGNTY_VIOLATION|HUMAN_MEANING_PLAINTEXT|PAYLOAD_PLAINTEXT|KEY_MATERIAL_PLAINTEXT",
      "surface": "string",
      "path": "string",
      "message": "string"
    }
  ]
}
```

- The output MUST list failures sorted by `(code, surface, path)`.

### 10.6 Fail‑closed behavior

- The Ledger Surface Scanner MUST output `status == FAIL` when any failure exists.
- The Ledger Surface Scanner MUST output `status == FAIL` when any required input is missing.
- The Ledger Surface Scanner MUST output `status == FAIL` when any schema validation fails.
- The Ledger Surface Scanner MUST output `status == FAIL` when any extracted item is not declared in the manifest.
- The Ledger Surface Scanner MUST output `status == FAIL` when any manifest item is not present in extraction.
- The Ledger Surface Scanner MUST output `status == FAIL` when any ambiguity exists in classification inputs.

### 10.7 Imperative-only language enforcement

- This specification MUST contain normative requirements expressed using MUST or MUST NOT.
- This specification MUST be treated as invalid when a normative requirement line lacks MUST and lacks MUST NOT.

## 11. Binding References

Each entry lists: **doc name**, **section heading**, **≤25‑word quote**, and **where applied**.

### 11.1 DRP prompt — NON‑NEGOTIABLE INVARIANTS (Binding)

- **BR‑P0‑01**  
  - Doc: DRP Prompt — “META‑TASK: ARCHITECT THE DYNAMIC ROSTER PROTOCOL (DRP) — DEEP SCAN v0.3”  
  - Section: NON‑NEGOTIABLE INVARIANTS — 0) VALIDITY + CHANGE CONTROL (FAIL‑CLOSED)  
  - Quote (≤25w): `You MUST treat the NON-NEGOTIABLE INVARIANTS in this prompt (and any LOCKED rules in the provided Constitution + blueprint + technical appendix) as immutable constraints.`  
  - Where applied: §§1–12 (global binding interpretation)

- **BR‑P0‑02**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 0) VALIDITY + CHANGE CONTROL (FAIL‑CLOSED)  
  - Quote (≤25w): `You MUST NOT propose weakening, bypassing, or redefining them.`  
  - Where applied: §§5–7 (gates + independence + stability), §10 (scanner veto)

- **BR‑P0‑03**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 0) VALIDITY + CHANGE CONTROL (FAIL‑CLOSED)  
  - Quote (≤25w): `If you believe any binding/LOCKED requirement must change, output: “REQUIRES ARCHITECT + PRODUCT APPROVAL” and STOP`  
  - Where applied: §§5.3, 6.6, 7.4 (stop conditions)

- **BR‑P0‑04**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 0) VALIDITY + CHANGE CONTROL (FAIL‑CLOSED)  
  - Quote (≤25w): `If your derived topology omits either (a) Spec/Governance compliance function or (b) Ledger/Security veto function`  
  - Where applied: §2.5 (topology generator fail‑closed)

- **BR‑P0‑05**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 0) VALIDITY + CHANGE CONTROL (FAIL‑CLOSED)  
  - Quote (≤25w): `The Spec/Governance compliance function and the Ledger/Security veto function MUST be implemented as separate seat-functions`  
  - Where applied: §§2.3.2–2.3.3 (mandatory functions), §6.3 (independence constraint)

- **BR‑P0‑06**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 0) VALIDITY + CHANGE CONTROL (FAIL‑CLOSED)  
  - Quote (≤25w): `‘different providers’ means different API vendor companies (e.g., OpenAI ≠ Anthropic ≠ Google), not different SKUs from the same vendor.`  
  - Where applied: §6.3–6.6 (provider independence enforcement)

- **BR‑P0‑07**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 0) VALIDITY + CHANGE CONTROL (FAIL‑CLOSED)  
  - Quote (≤25w): `INSUFFICIENT INDEPENDENCE — REQUIRES ARCHITECT + PRODUCT APPROVAL`  
  - Where applied: §6.5–6.6 (stop condition)

- **BR‑P0‑08**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 0) VALIDITY + CHANGE CONTROL (FAIL‑CLOSED)  
  - Quote (≤25w): `If you do not output the full “Roster Report” (per OUTPUT item 8) with every mandatory field populated`  
  - Where applied: §8 (Roster Report template + completeness requirement)

- **BR‑P0‑09**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 0) VALIDITY + CHANGE CONTROL (FAIL‑CLOSED)  
  - Quote (≤25w): `The DRP MUST include a section titled “Binding References” that lists every binding rule relied on`  
  - Where applied: §11 (this section)

- **BR‑P0‑10**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 0) VALIDITY + CHANGE CONTROL (FAIL‑CLOSED)  
  - Quote (≤25w): `you MUST quote the exact language (≤25 words) in “Binding References”`  
  - Where applied: §11.2 (LOCKED rule quotes), §12.2 (LOCKED rule appendix)

- **BR‑P1‑01**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 1) NO HARDCODED MODEL LIST  
  - Quote (≤25w): `You MUST include a “Model Registry Update” procedure each run that discovers current candidate models`  
  - Where applied: §3 (Model Registry Update)

- **BR‑P1‑02**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 1) NO HARDCODED MODEL LIST  
  - Quote (≤25w): `The DRP must work even when new models appear or old ones are removed.`  
  - Where applied: §§3.5–3.6 (registry update + parsing)

- **BR‑P2‑01**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 2) NO HARDCODED SEAT COUNT OR NAMES  
  - Quote (≤25w): `You MUST derive the seat FUNCTIONS needed from the docs + the current Step.`  
  - Where applied: §2 (Topology Generator)

- **BR‑P2‑02**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 2) NO HARDCODED SEAT COUNT OR NAMES  
  - Quote (≤25w): `you MUST preserve these FUNCTIONS regardless of naming/topology:`  
  - Where applied: §2.1–2.5 (mandatory functions preserved)

- **BR‑P3‑01**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 3) SOURCE‑VETTING + ADOPTION CONTROL  
  - Quote (≤25w): `Define a rubric for which external sources/benchmarks/arenas are allowed.`  
  - Where applied: §3.4, §4.5 (Source Registry + priors)

- **BR‑P3‑02**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 3) SOURCE‑VETTING + ADOPTION CONTROL  
  - Quote (≤25w): `New sources must be “CANDIDATE” until ratified (do not silently adopt).`  
  - Where applied: §3.4.2, §4.5 (candidate weight=0)

- **BR‑P4‑01**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 4) INTERNAL EVAL ANCHOR  
  - Quote (≤25w): `Define minimal internal eval packs per function as the anchor.`  
  - Where applied: §4.4 (internal eval pack specs)

- **BR‑P4‑02**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 4) INTERNAL EVAL ANCHOR  
  - Quote (≤25w): `External leaderboards are supporting priors only.`  
  - Where applied: §4.5 (external priors)

- **BR‑P4‑03**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 4) INTERNAL EVAL ANCHOR  
  - Quote (≤25w): `If live data can’t be retrieved or cited, the run MUST mark that metric as MISSING and reduce confidence; do not infer.`  
  - Where applied: §§3.6, 4.6, 6.6 (missing metrics)

- **BR‑P4‑04**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 4) INTERNAL EVAL ANCHOR  
  - Quote (≤25w): `define a minimal internal eval pack spec (min 10 items; target 10–30) including: task types covered, exact input/output schema`  
  - Where applied: §4.4 (pack specs)

- **BR‑P4‑05**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 4) INTERNAL EVAL ANCHOR  
  - Quote (≤25w): `Missing/conflicting internal eval data ⇒ mark MISSING, reduce confidence, and fail-closed: do not upgrade/swap`  
  - Where applied: §§6.6, 7.3.2 (fail‑closed stability)

- **BR‑P5‑01**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 5) STABILITY / ANTI‑THRASH  
  - Quote (≤25w): `Add hysteresis (replace incumbent only if challenger beats by X% over a rolling window)`  
  - Where applied: §7.3.2 (hysteresis)

- **BR‑P5‑02**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 5) STABILITY / ANTI‑THRASH  
  - Quote (≤25w): `Add minimum tenure (don’t rotate more often than N steps or M days)`  
  - Where applied: §7.3.2 (tenure)

- **BR‑P5‑03**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 5) STABILITY / ANTI‑THRASH  
  - Quote (≤25w): `Add rollback rules if a model regresses.`  
  - Where applied: §7.3.3 (rollback)

- **BR‑P5‑04**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 5) STABILITY / ANTI‑THRASH  
  - Quote (≤25w): `Fail-closed stability: if metrics are missing/conflicting, keep incumbent (or run the Bootstrap process if no incumbent) and log the reason; never infer.`  
  - Where applied: §§6.6, 7.3.2 (keep incumbent)

- **BR‑P5‑05**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 5) STABILITY / ANTI‑THRASH  
  - Quote (≤25w): `require explicit human ratification of the initial roster; then treat that roster as incumbent`  
  - Where applied: §7.4 (bootstrap)

- **BR‑P6‑01**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 6) SEAT 4 SAFETY  
  - Quote (≤25w): `Ledger/Security function is assist-only and cannot override deterministic Ledger Surface Scanner failures.`  
  - Where applied: §10.1 (scanner veto), §6.6

- **BR‑P6‑02**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 6) SEAT 4 SAFETY  
  - Quote (≤25w): `DRP MUST specify the deterministic “Ledger Surface Scanner” gate: surfaces scanned, classification logic, inputs/outputs`  
  - Where applied: §10 (scanner specification)

- **BR‑P7‑01**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 7) FAIL‑CLOSED META‑RULE (DRP‑LEVEL)  
  - Quote (≤25w): `default to the most restrictive safety/auditability-preserving interpretation and document it in the Roster Report.`  
  - Where applied: §§1.1, 2.5, 6.6, 8.L

- **BR‑P7‑02**  
  - Doc: DRP Prompt — Deep Scan v0.3  
  - Section: NON‑NEGOTIABLE INVARIANTS — 7) FAIL‑CLOSED META‑RULE (DRP‑LEVEL)  
  - Quote (≤25w): `Ledger Surface Scanner specification MUST use only imperative language (MUST/MUST NOT).`  
  - Where applied: §10 (scanner spec wording)

### 11.2 Technical Appendix v9.1 — cited LOCKED rules (Binding)

- **BR‑TA‑2.1‑01**  
  - Doc: Technical Appendix v9.1  
  - Section: 2.1 Ciphertext (LOCKED)  
  - Quote (≤25w): `The following **must be encrypted on client** and must not exist as plaintext on the server:` 【16:0†Technical Appendix v9.1.txt†L33-L34】  
  - Where applied: §10.4 (ciphertext default + plaintext failure)

- **BR‑TA‑2.1‑02**  
  - Doc: Technical Appendix v9.1  
  - Section: 2.1 Ciphertext (LOCKED)  
  - Quote (≤25w): `Profile “human meaning” fields (name, DOB, bio, photos, notes).` 【16:0†Technical Appendix v9.1.txt†L35-L35】  
  - Where applied: §10.4 (human meaning plaintext failure)

- **BR‑TA‑2.2‑01**  
  - Doc: Technical Appendix v9.1  
  - Section: 2.2 Plaintext (allowed operational metadata) (LOCKED)  
  - Quote (≤25w): `**Sovereignty rule (binding):** If the server can avoid knowing it, it must be ciphertext.` 【16:1†Technical Appendix v9.1.txt†L57-L57】  
  - Where applied: §10.4 (sovereignty rule failure)

## 12. Binding Appendix

### 12.1 Prompt NON‑NEGOTIABLE INVARIANTS (verbatim)

```text
NON-NEGOTIABLE INVARIANTS
0) VALIDITY + CHANGE CONTROL (FAIL-CLOSED):
   - You MUST treat the NON-NEGOTIABLE INVARIANTS in this prompt (and any LOCKED rules in the provided Constitution + blueprint + technical appendix) as immutable constraints. You MUST NOT propose weakening, bypassing, or redefining them. If you believe any binding/LOCKED requirement must change, output: “REQUIRES ARCHITECT + PRODUCT APPROVAL” and STOP (no workaround).
   - Validity rule: If your derived topology omits either (a) Spec/Governance compliance function or (b) Ledger/Security veto function (even by merging/renaming), mark the DRP output INVALID, output the reason, and STOP.
   - Independence rule (FAIL-CLOSED): The Spec/Governance compliance function and the Ledger/Security veto function MUST be implemented as separate seat-functions and MUST be assigned to different models/providers - for avoidance of doubt: ‘different providers’ means different API vendor companies (e.g., OpenAI ≠ Anthropic ≠ Google), not different SKUs from the same vendor. (no single model may hold both). If sufficient distinct candidates are unavailable, output: ‘INSUFFICIENT INDEPENDENCE — REQUIRES ARCHITECT + PRODUCT APPROVAL’ and STOP.
   - AUDITABILITY FAIL-CLOSED: If you do not output the full “Roster Report” (per OUTPUT item 8) with every mandatory field populated (or explicitly marked MISSING where allowed), your DRP output is INVALID — output the reason and STOP.
   - BINDING REFERENCES FAIL-CLOSED: The DRP MUST include a section titled “Binding References” that lists every binding rule relied on with: (doc name + section heading + ≤25-word quote + where applied in the DRP). If any relied-on binding rule is not quoted there, the DRP output is INVALID — output the reason and STOP.
      - CHANGE-CONTROL ANCHOR: When citing LOCKED/change-control rules from provided binding sources, you MUST quote the exact language (≤25 words) in “Binding References” and treat it as binding (no paraphrase-based reinterpretation).

1) NO HARDCODED MODEL LIST:
   - You MUST include a “Model Registry Update” procedure each run that discovers current candidate models and captures:
     provider, model id, release date, pricing ($/token or tier), latency notes (if available), context limits (if available), and citations.
   - The DRP must work even when new models appear or old ones are removed.

2) NO HARDCODED SEAT COUNT OR NAMES:
   - You MUST derive the seat FUNCTIONS needed from the docs + the current Step.
   - However, you MUST preserve these FUNCTIONS regardless of naming/topology:
     (a) Spec/Governance compliance check (LOCKED + scope + packet contract)
     (b) Ledger/Security veto function
   - You may add/remove other seats depending on Step needs.

3) SOURCE-VETTING + ADOPTION CONTROL:
   - Define a rubric for which external sources/benchmarks/arenas are allowed.
   - New sources must be “CANDIDATE” until ratified (do not silently adopt).

4) INTERNAL EVAL ANCHOR:
   - Define minimal internal eval packs per function as the anchor.
   - External leaderboards are supporting priors only.
   - If live data can’t be retrieved or cited, the run MUST mark that metric as MISSING and reduce confidence; do not infer.
   - For each seat-function, define a minimal internal eval pack spec (min 10 items; target 10–30) including: task types covered, exact input/output schema, scoring rubric, and a deterministic scoring method/script description.
   - Missing/conflicting internal eval data ⇒ mark MISSING, reduce confidence, and fail-closed: do not upgrade/swap based on that metric.

5) STABILITY / ANTI-THRASH:
   - Add hysteresis (replace incumbent only if challenger beats by X% over a rolling window)
   - Add minimum tenure (don’t rotate more often than N steps or M days)
   - Add rollback rules if a model regresses.
   - Fail-closed stability: if metrics are missing/conflicting, keep incumbent (or run the Bootstrap process if no incumbent) and log the reason; never infer.
   - Bootstrap (Genesis) exception: If no incumbent exists, define a one-time bootstrap selection process using the minimal internal eval anchor + conservative constraints, and require explicit human ratification of the initial roster; then treat that roster as incumbent for tenure/hysteresis going forward.

6) SEAT 4 SAFETY:
   - Ledger/Security function is assist-only and cannot override deterministic Ledger Surface Scanner failures.
   - DRP MUST specify the deterministic “Ledger Surface Scanner” gate: surfaces scanned, classification logic, inputs/outputs, and explicit fail-closed behavior; LLM review is advisory only.

7) FAIL-CLOSED META-RULE (DRP-LEVEL): 

   - If you encounter any ambiguity interpreting/applying invariants, you MUST default to the most restrictive safety/auditability-preserving interpretation and document it in the Roster Report. The deterministic Ledger Surface Scanner specification MUST use only imperative language (MUST/MUST NOT). 
      - Any conditional/soft language (e.g., may/should/recommended/unless) in the scanner spec makes the DRP output INVALID — output the reason and STOP.
```

### 12.2 Cited LOCKED rules (verbatim)

- Technical Appendix v9.1 — 2.1 Ciphertext (LOCKED)
  - `The following **must be encrypted on client** and must not exist as plaintext on the server:` 【16:0†Technical Appendix v9.1.txt†L33-L34】
  - `Profile “human meaning” fields (name, DOB, bio, photos, notes).` 【16:0†Technical Appendix v9.1.txt†L35-L35】

- Technical Appendix v9.1 — 2.2 Plaintext (allowed operational metadata) (LOCKED)
  - `**Sovereignty rule (binding):** If the server can avoid knowing it, it must be ciphertext.` 【16:1†Technical Appendix v9.1.txt†L57-L57】
