# Plan Object Schema — Unified Initiative Contract

> **Status**: Design reference  
> **Last updated**: 2026-03-31  
> **Purpose**: Single source of truth for the plan object that flows between Strategy Engine, family orchestrators, and Review Packets

---

## Overview

Every content initiative in Brandflow is represented by a **Plan Object**. This is the canonical contract that:

1. **Strategy Engine (#21)** produces (from business intent)
2. **Family orchestrators** consume (to execute generation)
3. **Review Packet Engine (#19)** references (for approval context)
4. **Performance Feedback Engine (#22)** links back to (for learning)

---

## Plan Object Schema

```json
{
  "plan_object": {
    "plan_id": "uuid",
    "initiative_id": "uuid",
    "brand_id": "uuid",
    "created_at": "ISO 8601",
    "status": "queued | planning | generating | review | approved | delivered | published",

    "intent": {
      "objective": "awareness | engagement | conversion | retention",
      "brief": "string (user-provided or strategy-generated)",
      "campaign_track_id": "uuid | null",
      "pillar_id": "uuid | null",
      "priority": "high | medium | low"
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

    "risk_assessment": {
      "risk_level": "low | medium | high",
      "flags": ["string"],
      "requires_human_review": true,
      "cultural_sensitivity": "none | low | medium | high"
    },

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

---

## Consumers

| Consumer | Fields Used | Purpose |
|----------|-------------|---------|
| Strategy Engine (#21) | Produces full object | Creates initiatives from strategy plans |
| Creative Director Agent (#1) | `intent`, `routing`, `generation_config` | Generates creative direction |
| Provider & Tier Routing (#9) | `generation_config.provider_route`, `cost_estimate.tier` | Routes to correct provider/model |
| Plan Review Gate (#2) | `intent`, `cost_estimate`, `risk_assessment` | Displays approval context |
| Review Packet Engine (#19) | `plan_id`, `variant_config`, `cost_estimate`, `risk_assessment` | Attaches plan context to review packets |
| Re-entry Controller (#10) | `status`, `plan_id` | Determines resume point |
| Campaign Multiplication (W6) | `variant_config` | Determines multiplication scope |
| Performance Feedback (#22) | `plan_id`, `initiative_id`, `routing` | Links performance back to planning decisions |

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
| Standard content within brand guidelines | low | — |

---

## Database Schema

```sql
CREATE TABLE plan_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL,
  brand_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  intent JSONB NOT NULL,
  routing JSONB NOT NULL,
  generation_config JSONB NOT NULL DEFAULT '{}',
  variant_config JSONB NOT NULL DEFAULT '{}',
  cost_estimate JSONB DEFAULT '{}',
  risk_assessment JSONB DEFAULT '{}',
  latency_tier JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_plan_objects_brand ON plan_objects(brand_id);
CREATE INDEX idx_plan_objects_status ON plan_objects(status);
CREATE INDEX idx_plan_objects_initiative ON plan_objects(initiative_id);
```
