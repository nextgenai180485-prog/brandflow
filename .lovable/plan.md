

# Enterprise Planning Governance — Phased Implementation

## What This Adds

10 enterprise-grade planning capabilities missing from the current Strategy Engine (#21) and Plan Object Schema, organized into 3 delivery phases.

---

## Phase 1: Governance & Control (Foundational)

These are non-negotiable for any enterprise deployment. Without them, a single user can drain budget or bypass approval chains.

### 1A. Budget & Spend Governance

**File**: New `docs/engines/BUDGET_GOVERNANCE.md` + update `PLAN_OBJECT_SCHEMA.md`

- `brand_budgets` table: monthly/quarterly spend caps per brand
- `budget_allocations` table: per-campaign-track allocated vs consumed
- Pre-flight check: Strategy Engine (#21) queries remaining budget before queueing any initiative
- Hard block: if `cost_estimate.total_usd > remaining_budget`, initiative enters `blocked_budget` status
- Soft warning: if spend would exceed 80% of period budget, flag for human review
- Add `budget_check` field to Plan Object: `{ "status": "passed | warning | blocked", "remaining_usd": number }`

### 1B. Configurable Approval Chains

**File**: Update `docs/engines/REVIEW_PACKET_ENGINE.md`

- `approval_policies` table: per-brand rules defining who approves what
- Threshold-based escalation: cost > $X routes to senior approver
- Role-based gates: `reviewer | approver | admin` with configurable chain depth
- Family-specific policies: e.g., F5 Cinematic always requires creative director sign-off
- Auto-approve rules: e.g., standard-tier F4 Social below $5 can skip review
- Add `approval_chain` array to Review Packet schema: `[{ "role": "string", "user_id": "uuid", "decision": "pending | approved | rejected", "decided_at": "ISO 8601" }]`

### 1C. Plan Versioning & Diff

**File**: Update `PLAN_OBJECT_SCHEMA.md`

- `plan_versions` table: immutable snapshots on every mutation
- `version` integer on `plan_objects` table, auto-incremented
- `changed_fields` JSONB on each version record (lightweight diff)
- Rollback: re-entry controller (#10) can restore any prior version
- Audit Layer 3 integration: every version change emits an `audit_log` entry

---

## Phase 2: Operational Efficiency

These make the system predictable under load. Without them, you can schedule 50 premium jobs against a provider with a 10-job-per-minute rate limit.

### 2A. Capacity Planning & Queue Management

**File**: Update `docs/engines/STRATEGY_ENGINE.md`

- `provider_capacity` table: rate limits, concurrent job caps per provider
- Strategy Engine checks capacity before slot assignment
- Queue priority scoring: `urgency x pillar_weight x trend_score x deadline_proximity`
- Backpressure: if provider queue depth > threshold, Strategy Engine defers to fallback or delays
- Add `capacity_check` to Plan Object: `{ "provider_available": true, "queue_position": number, "estimated_start": "ISO 8601" }`

### 2B. SLA & Deadline Enforcement

**File**: Update `PLAN_OBJECT_SCHEMA.md` + `docs/engines/STRATEGY_ENGINE.md`

- Add `deadline` field to Plan Object intent: `{ "due_at": "ISO 8601", "sla_tier": "urgent | standard | flexible" }`
- Critical path calculation: sum of estimated stage durations vs time remaining
- Escalation triggers: job at 75% of deadline with < 50% stages complete fires alert
- Event Bus integration: `sla.warning` and `sla.breach` event types
- Metrics rollup: SLA compliance rate per brand, family, provider

### 2C. Forecasting & What-If Modeling

**File**: New section in `docs/engines/STRATEGY_ENGINE.md`

- Dry-run mode: Strategy Engine produces full plan with cost/capacity estimates without queueing
- `forecast_runs` table: stores simulation results for comparison
- Inputs: proposed campaign track + budget + timeline
- Outputs: projected spend, provider load distribution, SLA risk score, family utilization
- No new engine module — this is a Strategy Engine (#21) capability extension

---

## Phase 3: Scale & Sophistication

These separate a product from an enterprise platform. They compound value as usage grows.

### 3A. Plan Templates & Playbooks

**File**: New section in `docs/engines/STRATEGY_ENGINE.md`

- `plan_templates` table: reusable campaign blueprints
- Template fields: family mix, platform distribution, pillar structure, approval chain preset
- Instantiation: clone template into new `strategy_plan` with brand-specific overrides
- Template marketplace: admin-curated templates by vertical (e-commerce, SaaS, hospitality)

### 3B. Dependency Tracking (DAG)

**File**: Update `PLAN_OBJECT_SCHEMA.md`

- `plan_dependencies` table: `{ "plan_id": uuid, "depends_on_plan_id": uuid, "type": "blocks | informs" }`
- Blocking: F5 Cinematic cannot start until F6 Core Elements Board is approved
- Informing: F7 Ad Creator reads outputs from F3 Product Videography but does not block
- Re-entry Controller (#10) checks dependency status before resuming blocked plans
- Add `dependencies` array to Plan Object: `[{ "plan_id": "uuid", "type": "blocks | informs", "status": "pending | satisfied" }]`

### 3C. Schedule Conflict Resolution

**File**: Update `docs/engines/STRATEGY_ENGINE.md`

- Conflict detection: two slots targeting same platform + same time window
- Resolution strategies: `shift_time | merge_slot | drop_lower_priority`
- Constraint: max N posts per platform per day (configurable per brand)
- Strategy Engine runs conflict check before finalizing weekly schedule

### 3D. Cross-Brand Portfolio View

**File**: New section in `docs/engines/STRATEGY_ENGINE.md`

- Agency-tier capability: view all brands' plans in unified dashboard
- Portfolio-level budget governance: agency spend caps across brands
- Shared template library across portfolio brands
- Metrics Layer 2 aggregation: `mv_portfolio_health` materialized view

---

## Files Changed

| Phase | File | Action |
|-------|------|--------|
| 1 | `docs/engines/BUDGET_GOVERNANCE.md` | Create |
| 1 | `docs/PLAN_OBJECT_SCHEMA.md` | Add budget_check, version, dependencies fields |
| 1 | `docs/engines/REVIEW_PACKET_ENGINE.md` | Add approval_policies and chain schema |
| 2 | `docs/engines/STRATEGY_ENGINE.md` | Add capacity, SLA, forecasting, conflicts, templates, portfolio sections |
| 2 | `docs/PLAN_OBJECT_SCHEMA.md` | Add deadline/SLA and capacity_check fields |
| 3 | `docs/engines/STRATEGY_ENGINE.md` | Same file, additional sections |
| All | `docs/ENGINE_MODULE_REGISTRY.md` | Cross-reference planning governance capabilities |

**Total**: 1 new file + 4 updated files across 3 phases.

No new engine modules. Module count stays at 22. These are capability extensions to existing modules.

