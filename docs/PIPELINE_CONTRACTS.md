# Pipeline Contracts — Standardized Input/Output Reference

> **Status**: Design reference — master contract for all 8 pipeline families  
> **Last updated**: 2026-03-31  
> **Engine count**: 22 modules + 1 workflow — see ENGINE_MODULE_REGISTRY.md

---

## Overview

Each pipeline family has a standardized contract defining its inputs, outputs, and which engine modules it consumes. This document serves as the single reference for integration between families, engines, and the orchestration layer.

---

## Family Contracts

### F1 — UGC Video Pipeline

| Field | Value |
|-------|-------|
| **Input** | Reference image URL, video count, dialogue (optional), model, aspect ratio, special requests |
| **Output** | Individual video clips (Variant A) or single merged video (Variant B) |
| **Primary Deliverable** | MP4 video file(s) |
| **Engine Modules** | Asset Analyzer, Creative Director Agent, Plan Review Gate, Revision Agent, Core Elements Board, Music Engine (optional), Assembly Engine, Re-entry Controller, Provider & Tier Routing, UGC Voiceover (optional), Character Consistency (multi-scene), Brand Voice DNA (dialogue) |
| **Doc** | `pipelines/UGC_VIDEO_PIPELINE.md` |

### F2 — AI Spokesperson (Lip-Sync Talking Head)

| Field | Value |
|-------|-------|
| **Input** | Script, spokesperson photo, voice mode (upload/TTS/clone), aspect ratio |
| **Output** | Lip-synced talking-head video with optional music and captions |
| **Primary Deliverable** | MP4 video file |
| **Engine Modules** | Asset Analyzer, Creative Director Agent (script enhancement), Plan Review Gate, Revision Agent, Hook Library, Music Engine (optional), Assembly Engine, Re-entry Controller, Provider & Tier Routing, Motion Variant Selector, Brand Voice DNA |
| **Doc** | `pipelines/AI_SPOKESPERSON_PIPELINE.md` |

### F3 — Product Videography

| Field | Value |
|-------|-------|
| **Input** | Product image, core elements board, creative direction, aspect ratio |
| **Output** | Product showcase video with start/end frames per scene |
| **Primary Deliverable** | MP4 video file |
| **Engine Modules** | Asset Analyzer, Creative Director Agent, Plan Review Gate, Revision Agent, SEALCaM, Core Elements Board, Music Engine (optional), Assembly Engine, Re-entry Controller (reference pattern), Provider & Tier Routing |
| **Doc** | `pipelines/PRODUCT_VIDEOGRAPHY_PIPELINE.md` |

### F4 — Social Content Batch

| Field | Value |
|-------|-------|
| **Input** | Topic, keywords (optional), link (optional) |
| **Output** | Platform-optimized posts for 7 platforms + generated image(s) |
| **Primary Deliverable** | JSON with per-platform content + image URLs |
| **Engine Modules** | Creative Director Agent, Plan Review Gate, Revision Agent, Hook Library, Core Elements Board, Re-entry Controller, Template-Driven Image Composer, Brand Voice DNA, Provider & Tier Routing |
| **Doc** | `pipelines/SOCIAL_CONTENT_PIPELINE.md` |

### F5 — Cinematic Ad

| Field | Value |
|-------|-------|
| **Input** | Creative direction, core image, core elements board, aspect ratio, voice ID |
| **Output** | Full cinematic ad with synced video, music, and voiceover |
| **Primary Deliverable** | MP4 video file |
| **Engine Modules** | Asset Analyzer, Creative Director Agent, Plan Review Gate, Revision Agent, SEALCaM, Core Elements Board, Hook Library, Music Engine, Assembly Engine, Re-entry Controller, Provider & Tier Routing, Character Consistency, Brand Voice DNA |
| **Doc** | `pipelines/CINEMATIC_AD_PIPELINE.md` |

### F6 — Core Elements Board

| Field | Value |
|-------|-------|
| **Input** | Wireframe template, character photo, setting photo, product photo |
| **Output** | Composite brand board image (9:16) |
| **Primary Deliverable** | PNG image file |
| **Engine Modules** | Asset Analyzer (optional), Re-entry Controller, Provider & Tier Routing |
| **Doc** | `pipelines/CORE_ELEMENTS_BOARD.md` |

### F7 — Ad Creator

| Field | Value |
|-------|-------|
| **Input** | Reference image, creative brief |
| **Output** | Single polished product ad (image + video) + caption |
| **Primary Deliverable** | MP4 video file + image + caption |
| **Engine Modules** | Asset Analyzer, Creative Director Agent (reference pattern), Plan Review Gate (reference pattern), Revision Agent (reference pattern), SEALCaM (includes F7 normalization), Core Elements Board, Hook Library, Music Engine (optional), Assembly Engine, Re-entry Controller, Provider & Tier Routing, Brand Voice DNA |
| **Doc** | `pipelines/AD_CREATOR_PIPELINE.md` |

### F8 — Creative Cloner

| Field | Value |
|-------|-------|
| **Input** | Source video URL, reference images, brand brief |
| **Output** | Recreated video preserving original cinematic structure |
| **Primary Deliverable** | MP4 video file |
| **Engine Modules** | Asset Analyzer (reference pattern), Creative Director Agent, Plan Review Gate, Revision Agent, SEALCaM (reference pattern), Core Elements Board, Hook Library, Music Engine, Assembly Engine, Re-entry Controller, Provider & Tier Routing, Character Consistency, Brand Voice DNA |
| **Doc** | `pipelines/CREATIVE_CLONER_PIPELINE.md` |

---

## Shared Contract Patterns

### Job Stage Flow (All Families)

Every family follows this abstract stage flow:
```
brief_intake → asset_analysis → planning → plan_review → [revision_loop] → generation → assembly → post_production → [localization] → delivery
```

Specific stage names vary per family but map to this pattern.

### Artifact Storage (All Families)

All generated artifacts are stored in Supabase Storage with metadata in the `artifacts` table:
```json
{
  "artifact_id": "uuid",
  "job_id": "uuid",
  "family": "F1|F2|F3|F4|F5|F6|F7|F8",
  "type": "video|image|audio|text",
  "storage_url": "https://...",
  "metadata": { "duration": 30, "aspect_ratio": "9:16", "file_size_kb": 5200 }
}
```

### Cost Tracking (All Families) — Billing Hierarchy

> **CRITICAL: No Double-Charging.** Every billable API call is logged in exactly ONE billing source. Other tables mirror cost for observability only.

#### Billing Source of Truth: `job_stages.cost`

Every stage logs cost as a JSONB object:
```json
{
  "provider": "kie_ai",
  "model": "veo3_fast",
  "cost_usd": 0.12,
  "tier": "draft"
}
```

**Total job cost** = `SUM(job_stages.cost->>'cost_usd')` across all stages for that job.

#### Domain Detail Tables (Feed Into `job_stages`, NOT Billed Separately)

| Table | What It Logs | Relationship to `job_stages` |
|-------|-------------|------------------------------|
| `voice_generations.cost_usd` | Per-TTS/dub/clone call cost | `job_stages.cost.voice_total = SUM(voice_generations.cost_usd)` — do NOT add both |
| `touchpoint_events.cost_usd` | Per-touchpoint mirror | **Observability only — NOT for billing.** Mirrors `job_stages.cost` for dashboards |

#### Post-Production Cost Rule

Module #17 runs 5-7 sub-operations (subtitles, watermark, enhance, thumbnail, export). These are logged as **ONE** `job_stages` entry with a cost breakdown:
```json
{
  "stage": "post_production",
  "cost": {
    "provider": "byteplus_vod",
    "cost_usd": 0.15,
    "tier": "standard",
    "breakdown": {
      "subtitles": 0.03,
      "watermark": 0.02,
      "enhancement": 0.05,
      "thumbnails": 0.02,
      "export": 0.03
    }
  }
}
```
Do NOT create separate `job_stages` rows for each sub-operation.

#### Motion Variant Cost Rule (F2)

When generating 3 Kling variants for motion selection, all 3 are real billable costs. Log as ONE `job_stages` entry:
```json
{
  "stage": "base_video_generation",
  "cost": {
    "provider": "kie_ai",
    "model": "kling_2.6",
    "cost_usd": 0.36,
    "tier": "standard",
    "note": "3 variants generated, 1 selected (variant scoring cost: $0.03)"
  }
}
```

#### Estimate Tables (Not Billing)

| Table | Purpose | Billing? |
|-------|---------|----------|
| `plan_object.cost_estimate` | Pre-generation estimate shown at Plan Review Gate | ❌ Never |
| `review_packet.generation_cost_estimate` | Rolled up from `job_stages` for approval display | ❌ Never |

---

### Delivery Output Contract (All Video Families)

Every video family produces a delivery output via Module #17:
```json
{
  "delivery": {
    "review": {
      "review_url": "string (stream-only, watermarked)",
      "expires_at": "ISO 8601",
      "watermarked": true,
      "resolution": "720p",
      "stream_only": true
    },
    "production": {
      "status": "locked | unlocked",
      "approved_at": "ISO 8601 | null",
      "exports": [{ "platform": "string", "format": "string", "aspect_ratio": "string", "resolution": "string", "download_url": "string | null" }],
      "subtitle_tracks": [{ "language": "string", "format": "srt | vtt", "url": "string" }],
      "dubbed_versions": [{ "language": "string", "audio_url": "string", "subtitle_url": "string" }],
      "thumbnails": [{ "url": "string", "timestamp_s": "number" }]
    }
  }
}
```

---

## Strategy Engine Output Contract

The Strategy Engine (#21) produces Plan Objects that feed into family orchestrators:

```json
{
  "strategy_output": {
    "plan_objects": ["ref: PLAN_OBJECT_SCHEMA.md"],
    "schedule": "weekly_schedule from strategy_plan",
    "campaign_tracks": ["track objects with family assignments"],
    "trend_injections": ["accepted trend signals mapped to slots"]
  }
}
```

See `PLAN_OBJECT_SCHEMA.md` for the full plan object contract.

---

## Performance Feedback Signal Contract

The Performance Feedback Engine (#22) emits signals consumed by other engines:

```json
{
  "feedback_output": {
    "hook_weight_updates": "→ Hook Library (#11)",
    "template_priority_updates": "→ Template Library",
    "family_routing_adjustments": "→ Provider Routing (#9)",
    "strategy_rebalancing_signals": "→ Strategy Engine (#21)"
  }
}
```

See `engines/PERFORMANCE_FEEDBACK_ENGINE.md` for signal schemas and confidence thresholds.

---

## Touchpoint Event Contract (Cross-Cutting)

Every engine module logs touchpoint events for enterprise-grade observability. This is a **shared contract**, not a separate engine.

### Design Principle: Reference IDs, Not Data Copies

Every touchpoint logs a signal row with foreign key references — never duplicating prompts, media payloads, or full schemas.

### Schema

```sql
CREATE TABLE touchpoint_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,              -- FK → jobs
  stage TEXT NOT NULL,                -- e.g. "asset_analysis", "generation", "post_production"
  module_id INTEGER NOT NULL,        -- 1-22, which engine handled this
  provider_id TEXT,                   -- e.g. "kie_ai", "elevenlabs", "byteplus_vod"
  action TEXT NOT NULL,               -- e.g. "generate", "score", "route", "approve"
  tier TEXT,                          -- "draft" | "standard" | "premium"
  status TEXT NOT NULL DEFAULT 'started', -- "started" | "completed" | "failed" | "skipped"
  cost_usd NUMERIC,                  -- nullable — only for billable actions
  latency_ms INTEGER,
  error_code TEXT,                    -- nullable
  metadata JSONB DEFAULT '{}',       -- max 1KB — scores, counts, flags ONLY
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_touchpoints_job ON touchpoint_events(job_id);
CREATE INDEX idx_touchpoints_module ON touchpoint_events(module_id, status);
CREATE INDEX idx_touchpoints_provider ON touchpoint_events(provider_id, status);
CREATE INDEX idx_touchpoints_created ON touchpoint_events(created_at);
```

### Metadata Rules (Enforced)

**Allowed in `metadata`** (lean signals only):
```json
{
  "variant_count": 3,
  "selected_variant": 2,
  "naturalness_score": 8.5,
  "voice_quality_score": 82,
  "hook_style": "question",
  "fallback_used": false
}
```

**NOT allowed in `metadata`**:
- Prompts → live in `job_stages.input_params`
- Media URLs → live in `artifacts` table
- Full schemas → live in their source tables
- User input → lives in `jobs.brief`

### Data Retention Policy

| Age | Action |
|-----|--------|
| 0–90 days | Full resolution — all touchpoints queryable |
| 90–365 days | Aggregate — roll up to daily summaries per module/provider |
| 365+ days | Archive — move to cold storage, keep monthly summaries |

### Query Patterns

| Question | Query |
|----------|-------|
| Every step of job X | `WHERE job_id = X ORDER BY created_at` |
| Which provider is failing? | `WHERE status = 'failed' GROUP BY provider_id` |
| P95 latency per module | `GROUP BY module_id, percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)` |
| Brand spend | `JOIN jobs ON brand_id, SUM(cost_usd)` |
| Stage bottlenecks | `GROUP BY stage, AVG(latency_ms)` |

---

## Ownership Boundaries (Consolidated)

These boundaries were established during the engine overlap audit to eliminate duplicate provider paths:

| Concern | Owner | Consumers (do NOT call providers directly) |
|---------|-------|---------------------------------------------|
| All voice/TTS operations | Voice Management Engine (#20) | UGC Voiceover (#16), Motion Variant (#15), Localization (#18) |
| Voice stem normalization (-16 LUFS) | Voice Management Engine (#20) | — |
| Final mix normalization (-14 LUFS) | Post-Production (#17) | — |
| Dubbing requests | Localization (#18) requests → #20 executes → #17 integrates | — |
| Template performance scoring | Performance Feedback (#22) | Template Library (consumes `template_priority_updates`) |
| Brand voice data | Brand Voice DNA (#12) emits | Creative Director (#1) consumes in system prompt |

---

## Cross-References

| Document | Purpose |
|----------|---------|
| `ENGINE_MODULE_REGISTRY.md` | Master registry of all 22 engine modules |
| `PLAN_OBJECT_SCHEMA.md` | Unified plan object contract |
| `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` | Original audit identifying shared patterns |
| `BRANDFLOW_FEATURE_GAPS.md` | Feature expansion gaps beyond engine modules |
| `BRANDFLOW_PRICING_STRATEGY.md` | Tier-based pricing tied to pipeline costs |
| `engines/PROVIDER_ROUTING_POLICY.md` | Unified provider + tier routing engine |
| `engines/BRAND_VOICE_DNA_ENGINE.md` | Voice signature injection contract |
| `engines/CHARACTER_CONSISTENCY_ENGINE.md` | Multi-scene character consistency |
| `engines/DELIVERY_POST_PRODUCTION_ENGINE.md` | Post-production finishing + review-safe delivery |
| `engines/REVIEW_PACKET_ENGINE.md` | Structured approval objects |
| `engines/VOICE_MANAGEMENT_ENGINE.md` | Unified voice abstraction |
| `engines/STRATEGY_ENGINE.md` | Business intent → creative plans |
| `engines/PERFORMANCE_FEEDBACK_ENGINE.md` | Learning loop + optimization signals |
| `pipelines/SEALCAM_FRAMEWORK.md` | Structured prompting (includes F7 normalization) |
| `OBSERVABILITY_CONTRACTS.md` | Enterprise observability: Event Bus, Metrics Aggregation, Audit Trail |
