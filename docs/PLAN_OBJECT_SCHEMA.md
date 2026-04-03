# Plan Object Schema — Unified Initiative Contract

> **Status**: Design reference  
> **Last updated**: 2026-04-03  
> **Purpose**: Single source of truth for the plan object and strategy object that flow through the entire system

---

## Overview

Every content initiative in Brandflow is represented by a **Plan Object**. Every creative decision is encoded in a **Strategy Object**. Together, these two contracts form the **system spine** — the canonical data structures that every engine reads from or writes to.

### Plan Object — Initiative Contract

The Plan Object is the **operational spine**: it tracks what needs to happen, when, at what cost, and through which provider.

1. **Strategy Engine (#21)** produces (from business intent)
2. **Family orchestrators** consume (to execute generation)
3. **Review Packet Engine (#19)** references (for approval context)
4. **Performance Feedback Engine (#22)** links back to (for learning)
5. **Budget Governance** enforces spend limits against (pre-flight check)

### Strategy Object — Creative Decision Contract

The Strategy Object is the **intelligence spine**: it encodes what creative direction was chosen, why, with what confidence, and what alternatives were considered.

1. **Decision Engine (#26)** produces (from brand memory + research + intent)
2. **Strategy Object Builder** transforms (into family-specific generation instructions)
3. **Trust & Explainability Engine** traces (why this decision was made)
4. **Creative Director Agent (#1)** reasons over (to generate final creative plan)
5. **Performance Feedback (#22)** evaluates against (to close the learning loop)

### System Spine Principle

> **Every major request must produce**: a strategy object, a rationale, a confidence signal, alternative paths, and traceable source inputs. No generation family may operate without a strategy_object.json — raw prompts are not a valid input.

---

## Strategy Object Schema

The `strategy_object.json` is the output of Decision Engine (#26) and the primary input to Strategy Object Builder and all downstream families.

```json
{
  "strategy_object": {
    "strategy_id": "uuid",
    "initiative_id": "uuid",
    "brand_id": "uuid",
    "created_at": "ISO 8601",

    "angle": {
      "type": "transformation | education | social_proof | lifestyle | urgency | fear_based | authority | curiosity",
      "rationale": "string — why this angle was selected",
      "confidence": 0.85,
      "source_signals": ["brand_memory:approved_3x", "category_cache:top_performer", "research:competitor_gap"]
    },

    "creative_family": "F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 | F9",

    "hook_type": {
      "style": "question | social_proof | bold_claim | before_after | statistic | curiosity_gap | pain_point | transformation",
      "text": "string — seed hook text",
      "hook_id": "uuid | null — reference to Hook Library",
      "performance_score": 0.78
    },

    "tone_profile": {
      "primary_tone": "warm | authoritative | playful | urgent | aspirational | authentic",
      "modifiers": ["conversational", "enthusiastic"],
      "brand_voice_alignment": 0.92
    },

    "persona_alignment": {
      "target_persona": "string — audience segment",
      "pain_points": ["string"],
      "desired_outcome": "string"
    },

    "platform_priority": {
      "primary": "instagram | tiktok | youtube | linkedin | twitter | facebook | pinterest",
      "secondary": ["string"],
      "platform_specific_notes": {}
    },

    "cta_strategy": {
      "type": "soft | direct | urgency | social_proof | educational",
      "text": "string — seed CTA text",
      "placement": "end | mid_and_end | overlay"
    },

    "asset_selection_strategy": {
      "mode": "generate_new | reuse_approved | hybrid",
      "reuse_candidates": ["artifact_id"],
      "generation_requirements": ["string"]
    },

    "testing_plan": {
      "enabled": true,
      "test_dimension": "hook_style | angle | cta | duration | platform",
      "variant_count": 2,
      "success_metric": "engagement_rate | click_through | completion_rate"
    },

    "confidence_score": 0.82,
    "rejected_alternatives": [
      {
        "angle": "urgency",
        "reason": "Brand Memory: 4 rejections of urgency hooks, do_not_use threshold approaching",
        "confidence_if_chosen": 0.45
      }
    ],

    "source_inputs": {
      "brand_memory_version": "ISO 8601",
      "category_cache_hit": true,
      "research_brief_id": "uuid | null",
      "performance_signals_count": 24,
      "hook_library_candidates_evaluated": 12
    }
  }
}
```

### Strategy Object Rules

| Rule | Detail |
|------|--------|
| **Required for all families** | No family orchestrator may start generation without a strategy_object |
| **Immutable once created** | Strategy objects are append-only; revisions create new strategy_id |
| **Must include alternatives** | At least 1 rejected alternative with reason (prevents "random selection" reasoning) |
| **Must include confidence** | Overall confidence_score + per-field confidence where applicable |
| **Must include source_inputs** | Traceability of what data informed the decision |
| **Consumed by Trust Engine** | Trust & Explainability Engine reads strategy_object to generate decision_trace |

### Strategy Object → Family Transformation

The Strategy Object Builder transforms `strategy_object.json` into family-specific generation instructions. See `engines/STRATEGY_OBJECT_BUILDER.md` for per-family output formats (F1 UGC, F4 Social, F5 Cinematic, etc.).

```
strategy_object.json → Strategy Object Builder → generation_instructions[F1..F9]
                                                → Creative Director Agent (#1)
                                                → Trust Engine → decision_trace.json
```

---

## Plan Object Schema

```json
{
  "plan_object": {
    "plan_id": "uuid",
    "initiative_id": "uuid",
    "brand_id": "uuid",
    "version": 1,
    "created_at": "ISO 8601",
    "status": "queued | planning | generating | review | approved | delivered | published | blocked_budget | blocked_dependency",

    "intent": {
      "objective": "awareness | engagement | conversion | retention",
      "brief": "string (user-provided or strategy-generated)",
      "campaign_track_id": "uuid | null",
      "pillar_id": "uuid | null",
      "priority": "high | medium | low",
      "deadline": {
        "due_at": "ISO 8601 | null",
        "sla_tier": "urgent | standard | flexible"
      }
    },

    "routing": {
      "family": "F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 | F9",
      "platform": "instagram | tiktok | youtube | linkedin | twitter | facebook | pinterest",
      "format": "reel | story | feed_post | carousel | short | long_form | image | ad",
      "aspect_ratio": "9:16 | 1:1 | 4:5 | 16:9 | 2:3"
    },

    "generation_config": {
      "tier": "draft | standard | premium",
      "provider_route": {
        "primary": "string (provider_id)",
        "model": "string",
        "fallback": "string (provider_id) | null"
      },
      "fallback_route": {
        "provider": "string (provider_id)",
        "model": "string"
      },
      "voice_config": {
        "enabled": false,
        "voice_preset_id": "uuid | null",
        "mode": "tts | clone | upload | none"
      },
      "music_config": {
        "enabled": false,
        "mood": "string | null",
        "duration_s": "number | null"
      }
    },

    "variant_config": {
      "hook_variants": 1,
      "hook_styles": ["question"],
      "aspect_ratio_variants": ["9:16"],
      "duration_variants_s": [],
      "localization_targets": [],
      "ab_testing_enabled": false
    },

    "cost_estimate": {
      "generation_usd": "number",
      "post_production_usd": "number",
      "localization_usd": "number",
      "total_usd": "number",
      "tier": "draft | standard | premium"
    },

    "budget_check": {
      "status": "passed | warning | blocked",
      "remaining_usd": "number",
      "period_cap_usd": "number",
      "consumed_usd": "number",
      "burn_rate_daily_usd": "number",
      "projected_exhaustion_date": "ISO 8601 | null"
    },

    "capacity_check": {
      "provider_available": true,
      "queue_position": "number | null",
      "estimated_start": "ISO 8601 | null",
      "backpressure_active": false
    },

    "risk_assessment": {
      "risk_level": "low | medium | high",
      "flags": ["string"],
      "requires_human_review": true,
      "cultural_sensitivity": "none | low | medium | high"
    },

    "dependencies": [
      {
        "plan_id": "uuid",
        "type": "blocks | informs",
        "status": "pending | satisfied"
      }
    ],

    "latency_tier": {
      "target": "fast | standard | quality",
      "estimated_duration_s": "number",
      "parallel_stages": ["music", "voice"]
    }
  }
}
```

---

## Status Flow

```
queued → planning → generating → review → approved → delivered → published
                        ↑                     │
                        └─── revision ────────┘

blocked_budget ──(budget increased)──→ queued
blocked_dependency ──(dependency satisfied)──→ queued
```

| Status | Owner | Description |
|--------|-------|-------------|
| `queued` | Strategy Engine (#21) | Initiative scheduled, awaiting execution |
| `planning` | Creative Director Agent (#1) | AI generating creative plan |
| `generating` | Family orchestrator | Media generation in progress |
| `review` | Review Packet Engine (#19) | Awaiting human approval |
| `approved` | Human reviewer | Approved for delivery |
| `delivered` | Delivery Engine (#17) | Production exports generated |
| `published` | Distribution Engine | Published to target platform |
| `blocked_budget` | Budget Governance | Cost exceeds remaining brand budget |
| `blocked_dependency` | Re-entry Controller (#10) | Waiting on upstream plan completion |

---

## Plan Versioning

Every mutation to a plan object creates an immutable version snapshot.

### Version Schema

```json
{
  "version_id": "uuid",
  "plan_id": "uuid",
  "version": 2,
  "changed_fields": ["intent.priority", "generation_config.tier"],
  "previous_values": {
    "intent.priority": "medium",
    "generation_config.tier": "premium"
  },
  "changed_by": "user_id | system:strategy_engine",
  "reason": "Budget downgrade — remaining budget insufficient for premium tier",
  "created_at": "ISO 8601"
}
```

### Version Rules

| Rule | Detail |
|------|--------|
| Immutable snapshots | Each version is a frozen record, never overwritten |
| Auto-increment | `version` field on `plan_objects` increments on every mutation |
| Diff tracking | `changed_fields` captures which fields changed (lightweight, no full snapshot) |
| Rollback support | Re-entry Controller (#10) can restore any prior version |
| Audit integration | Every version change emits an `audit_log` entry (Layer 3) |

---

## Deadline & SLA Enforcement

The `intent.deadline` field enables SLA tracking:

### SLA Tiers

| Tier | Target | Escalation Trigger |
|------|--------|-------------------|
| `urgent` | 2 hours | At 50% of time with < 50% stages complete |
| `standard` | 24 hours | At 75% of time with < 50% stages complete |
| `flexible` | 72 hours | At 90% of time with < 50% stages complete |

### Critical Path Calculation

```
critical_path_s = SUM(estimated_duration_s for all remaining stages)
time_remaining_s = deadline.due_at - now()
sla_risk = critical_path_s / time_remaining_s
```

| SLA Risk Score | Status | Action |
|----------------|--------|--------|
| < 0.5 | Green | No action |
| 0.5 – 0.8 | Amber | `sla.warning` event emitted |
| > 0.8 | Red | `sla.breach` event, escalation to admin |

### Event Bus Integration

| Event Type | Trigger |
|------------|---------|
| `sla.warning` | Risk score enters amber zone |
| `sla.breach` | Risk score enters red zone or deadline passed |

---

## Dependency Tracking (DAG)

The `dependencies` array enables blocking and informing relationships between plans:

### Dependency Types

| Type | Behavior | Example |
|------|----------|---------|
| `blocks` | Dependent plan cannot start until dependency is `approved` or `delivered` | F5 Cinematic blocked until F6 Core Elements Board approved |
| `informs` | Dependent plan can proceed but reads outputs from dependency | F7 Ad Creator reads product shots from F3 Product Videography |

### Resolution Flow

```
Plan A (F6 Core Elements) ──blocks──→ Plan B (F5 Cinematic Ad)
  │                                      │
  │ status: approved                     │ status: blocked_dependency
  │                                      │
  └──── dependency satisfied ───────────→│ status: queued (auto-resumed)
```

Re-entry Controller (#10) checks dependency status before resuming any `blocked_dependency` plan.

---

## Consumers

| Consumer | Fields Used | Purpose |
|----------|-------------|---------|
| Strategy Engine (#21) | Produces full object | Creates initiatives from strategy plans |
| Creative Director Agent (#1) | `intent`, `routing`, `generation_config` | Generates creative direction |
| Provider & Tier Routing (#9) | `generation_config.provider_route`, `cost_estimate.tier` | Routes to correct provider/model |
| Plan Review Gate (#2) | `intent`, `cost_estimate`, `risk_assessment`, `budget_check` | Displays approval context |
| Review Packet Engine (#19) | `plan_id`, `variant_config`, `cost_estimate`, `risk_assessment` | Attaches plan context to review packets |
| Re-entry Controller (#10) | `status`, `plan_id`, `dependencies` | Determines resume point and checks dependency status |
| Campaign Multiplication (W6) | `variant_config` | Determines multiplication scope |
| Performance Feedback (#22) | `plan_id`, `initiative_id`, `routing` | Links performance back to planning decisions |
| Budget Governance | `cost_estimate`, `brand_id` | Pre-flight spend check |

---

## Variant Config Details

The `variant_config` section drives Campaign Multiplication (W6):

| Field | Type | Description |
|-------|------|-------------|
| `hook_variants` | number | How many hook alternatives to generate (1 = no variants) |
| `hook_styles` | string[] | Which hook styles to use (from Hook Library #11) |
| `aspect_ratio_variants` | string[] | Target aspect ratios for platform variants |
| `duration_variants_s` | number[] | Target durations for cutdowns (e.g., [30, 15, 6]) |
| `localization_targets` | string[] | BCP-47 language codes for localized versions |
| `ab_testing_enabled` | boolean | Whether to generate structured A/B test packs |

---

## Risk Assessment Rules

| Condition | Risk Level | Flag |
|-----------|-----------|------|
| Localization to culturally sensitive markets | high | `cultural_sensitivity_review` |
| Premium tier with cost > $50 | medium | `high_cost_initiative` |
| First use of a family by this brand | medium | `new_family_usage` |
| Trend injection content | medium | `trend_driven_content` |
| Budget check returned `warning` | medium | `budget_pressure` |
| Standard content within brand guidelines | low | — |

---

## Database Schema

```sql
CREATE TABLE plan_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL,
  brand_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'queued',
  intent JSONB NOT NULL,
  routing JSONB NOT NULL,
  generation_config JSONB NOT NULL DEFAULT '{}',
  variant_config JSONB NOT NULL DEFAULT '{}',
  cost_estimate JSONB DEFAULT '{}',
  budget_check JSONB DEFAULT '{}',
  capacity_check JSONB DEFAULT '{}',
  risk_assessment JSONB DEFAULT '{}',
  dependencies JSONB DEFAULT '[]',
  latency_tier JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plan_objects(id) NOT NULL,
  version INTEGER NOT NULL,
  changed_fields JSONB NOT NULL DEFAULT '[]',
  previous_values JSONB NOT NULL DEFAULT '{}',
  changed_by TEXT NOT NULL, -- user_id or 'system:engine_name'
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (plan_id, version)
);

CREATE TABLE plan_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plan_objects(id) NOT NULL,
  depends_on_plan_id UUID REFERENCES plan_objects(id) NOT NULL,
  dependency_type TEXT NOT NULL, -- 'blocks' or 'informs'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' or 'satisfied'
  created_at TIMESTAMPTZ DEFAULT now(),
  satisfied_at TIMESTAMPTZ,
  UNIQUE (plan_id, depends_on_plan_id)
);

CREATE INDEX idx_plan_objects_brand ON plan_objects(brand_id);
CREATE INDEX idx_plan_objects_status ON plan_objects(status);
CREATE INDEX idx_plan_objects_initiative ON plan_objects(initiative_id);
CREATE INDEX idx_plan_versions_plan ON plan_versions(plan_id);
CREATE INDEX idx_plan_dependencies_plan ON plan_dependencies(plan_id);
CREATE INDEX idx_plan_dependencies_upstream ON plan_dependencies(depends_on_plan_id);
```
