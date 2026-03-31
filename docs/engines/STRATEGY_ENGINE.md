# Module #21 — Strategy Engine

> **Status**: Design reference  
> **Last updated**: 2026-03-31  
> **Owner**: Cross-family  
> **Depends on**: Module #12 (Brand Voice DNA), Module #11 (Hook Library), Module #9 (Provider & Tier Routing)

---

## Purpose

Translate business intent into executable creative plans. The Strategy Engine sits upstream of all generation — it decides **what** to create, **where** to publish, **which family** to use, and **how** to sequence content across a campaign.

Without this engine, users must manually choose families, platforms, and content types for every initiative. The Strategy Engine makes Brandflow a **strategic partner**, not just a generation tool.

---

## Responsibilities

| Responsibility | Description |
|----------------|-------------|
| Content Pillar Generation | Derive 3-5 thematic pillars from brand profile, vertical, and objectives |
| Weekly Post Schedule | Map pillars → platform slots with optimal posting cadence |
| Campaign Theme Generation | Create cohesive campaign narratives that span multiple assets |
| Trend Signal Detection | Ingest platform trend data and inject timely themes into schedules |
| Platform Mix Selection | Recommend platform distribution based on audience and vertical |
| Family Selection | Route each content initiative to the optimal generation family (F1-F9) |
| Initiative Priority Weighting | Rank queued initiatives by impact, urgency, and resource cost |

---

## Strategy Plan Schema

```json
{
  "strategy_plan": {
    "plan_id": "uuid",
    "brand_id": "uuid",
    "created_at": "ISO 8601",
    "status": "draft | active | paused | completed",
    "period": {
      "start_date": "ISO 8601",
      "end_date": "ISO 8601",
      "cadence": "weekly | biweekly | monthly"
    },

    "vertical_profile": {
      "industry": "string",
      "sub_vertical": "string",
      "audience_segments": ["string"],
      "brand_maturity": "emerging | growth | established",
      "content_goals": ["awareness", "engagement", "conversion", "retention"]
    },

    "content_pillars": [
      {
        "pillar_id": "uuid",
        "name": "string",
        "description": "string",
        "weight": 0.3,
        "tone": "string (from Brand Voice DNA #12)",
        "example_topics": ["string"]
      }
    ],

    "weekly_schedule": [
      {
        "day": "monday",
        "slots": [
          {
            "slot_id": "uuid",
            "time_utc": "14:00",
            "platform": "instagram | tiktok | youtube | linkedin | twitter | facebook | pinterest",
            "pillar_id": "uuid",
            "family": "F1 | F2 | F3 | F4 | F5 | F7 | F8 | F9",
            "format": "reel | story | feed_post | carousel | short | long_form",
            "priority": "high | medium | low"
          }
        ]
      }
    ],

    "campaign_tracks": [
      {
        "track_id": "uuid",
        "name": "string",
        "theme": "string",
        "start_date": "ISO 8601",
        "end_date": "ISO 8601",
        "pillars": ["pillar_id"],
        "families": ["F1", "F5"],
        "target_asset_count": 12,
        "generated_count": 0
      }
    ],

    "family_distribution": {
      "F1": 0.15,
      "F2": 0.10,
      "F3": 0.10,
      "F4": 0.25,
      "F5": 0.10,
      "F7": 0.15,
      "F8": 0.10,
      "F9": 0.05
    },

    "platform_distribution": {
      "instagram": 0.30,
      "tiktok": 0.25,
      "youtube": 0.15,
      "linkedin": 0.10,
      "twitter": 0.10,
      "facebook": 0.05,
      "pinterest": 0.05
    },

    "trend_injections": [
      {
        "trend_id": "uuid",
        "source": "tiktok_trending | google_trends | industry_news | platform_api",
        "topic": "string",
        "relevance_score": 0.85,
        "injected_at": "ISO 8601",
        "mapped_to_pillar": "pillar_id | null",
        "mapped_to_slot": "slot_id | null",
        "status": "suggested | accepted | rejected | expired"
      }
    ]
  }
}
```

---

## Planning Pipeline

```
Brand Profile + Objectives
  │
  ├─── Pillar Generation
  │      │  AI analyzes brand vertical, audience, and goals
  │      │  Produces 3-5 content pillars with weights
  │      │  Brand Voice DNA (#12) validates tone alignment
  │      │
  │      ▼
  ├─── Schedule Construction
  │      │  Maps pillars to platform slots
  │      │  Applies posting cadence best practices per platform
  │      │  Assigns optimal family per slot based on format
  │      │
  │      ▼
  ├─── Campaign Track Creation
  │      │  Groups related slots into campaign narratives
  │      │  Sets target asset counts and timelines
  │      │
  │      ▼
  ├─── Trend Injection
  │      │  Polls trend sources on schedule
  │      │  Scores relevance against brand pillars
  │      │  Suggests slot replacements or additions
  │      │
  │      ▼
  └─── Initiative Queue
         Each slot becomes a queued initiative
         Priority weighted by: campaign urgency × pillar weight × trend score
         Feeds directly into Planner Contract (family + variant selection)
```

---

## Family Selection Logic

The Strategy Engine selects families based on content format requirements:

| Format Need | Primary Family | Fallback |
|-------------|---------------|----------|
| Short-form video (< 30s) | F1 UGC Video | F7 Ad Creator |
| Talking-head / explainer | F2 AI Spokesperson | — |
| Product showcase | F3 Product Videography | F5 Cinematic Ad |
| Text + image posts | F4 Social Content | F9 Image Template |
| Premium video ad | F5 Cinematic Ad | F8 Creative Cloner |
| Polished product ad | F7 Ad Creator | F5 Cinematic Ad |
| Style-matched recreation | F8 Creative Cloner | F7 Ad Creator |
| Static visual content | F9 Image Template | F4 Social Content |

---

## Integration Points

| Engine | Interaction |
|--------|------------|
| #11 Hook Library | Strategy Engine requests hook style weights per pillar (question vs statistic vs bold_claim) |
| #12 Brand Voice DNA | Validates pillar tone descriptions against brand voice signature |
| #9 Provider & Tier Routing | Strategy Engine sets default tier per campaign track (draft for testing, premium for hero content) |
| Plan Object Schema | Each queued initiative produces a `plan_object` consumed by family orchestrators |
| #22 Performance Feedback | Receives rebalancing signals to adjust pillar weights and family distribution |

---

## Trend Source Adapters

| Source | Method | Refresh |
|--------|--------|---------|
| TikTok Creative Center | API poll | Every 6 hours |
| Google Trends | API poll | Daily |
| Industry RSS / News | Feed parser | Every 12 hours |
| Platform engagement signals | Internal (#22 Performance Feedback) | Real-time |

---

## Cross-Family Adoption

| Family | Strategy Engine Role |
|--------|---------------------|
| F1 UGC Video | ✅ Scheduled via weekly slots |
| F2 AI Spokesperson | ✅ Scheduled for explainer content |
| F3 Product Videography | ✅ Scheduled for product launches |
| F4 Social Content | ✅ Primary text/image scheduling |
| F5 Cinematic Ad | ✅ Scheduled for hero campaign content |
| F6 Core Elements Board | — (brand onboarding, not scheduled) |
| F7 Ad Creator | ✅ Scheduled for ad campaigns |
| F8 Creative Cloner | ✅ Scheduled when reference content available |
| F9 Image Template | ✅ Scheduled for static visual content |

---

## Capacity Planning & Queue Management (Phase 2A)

Before assigning initiatives to providers, the Strategy Engine checks provider capacity to prevent overloading.

### Provider Capacity Schema

```json
{
  "provider_id": "string",
  "model": "string",
  "rate_limit_rpm": 60,
  "max_concurrent_jobs": 10,
  "current_queue_depth": 3,
  "avg_job_duration_s": 120,
  "status": "available | degraded | offline"
}
```

### Queue Priority Scoring

```
priority_score = urgency_weight × pillar_weight × trend_score × deadline_proximity
```

| Factor | Weight Range | Source |
|--------|-------------|--------|
| `urgency_weight` | 1.0 – 3.0 | `intent.priority` (low=1, medium=1.5, high=3) |
| `pillar_weight` | 0.1 – 0.5 | Content pillar weight from strategy plan |
| `trend_score` | 0.0 – 1.0 | Trend injection relevance (0 if no trend) |
| `deadline_proximity` | 1.0 – 5.0 | Inversely proportional to time remaining |

### Backpressure Rules

| Condition | Action |
|-----------|--------|
| Queue depth > 80% of max concurrent | Route to fallback provider |
| All providers at capacity | Defer initiative, set `capacity_check.backpressure_active = true` |
| Provider status = `degraded` | Reduce concurrent job allocation by 50% |
| Provider status = `offline` | Route all jobs to fallback, emit `provider.offline` event |

### Plan Object Integration

```json
"capacity_check": {
  "provider_available": true,
  "queue_position": 4,
  "estimated_start": "2026-03-31T14:30:00Z",
  "backpressure_active": false
}
```

---

## SLA & Deadline Enforcement (Phase 2B)

The Strategy Engine monitors initiative progress against deadlines and triggers escalations.

### SLA Event Types

| Event | Trigger | Payload |
|-------|---------|---------|
| `sla.warning` | Risk score 0.5–0.8 | `{ plan_id, sla_tier, time_remaining_s, stages_complete_pct }` |
| `sla.breach` | Risk score > 0.8 or deadline passed | `{ plan_id, sla_tier, overdue_s }` |
| `sla.recovered` | Breached job completes | `{ plan_id, total_delay_s }` |

### Metrics Rollup

| Metric | Aggregation | Materialized View |
|--------|------------|-------------------|
| SLA compliance rate | Per brand, family, provider | `mv_sla_compliance` |
| Avg time to approval | Per family, tier | `mv_approval_latency` |
| Deadline miss rate | Per campaign track | `mv_deadline_performance` |

---

## Forecasting & What-If Modeling (Phase 2C)

Dry-run mode allows the Strategy Engine to simulate a full plan without queueing any initiatives.

### Forecast Request

```json
{
  "mode": "forecast",
  "campaign_track": {
    "pillars": ["pillar_id_1", "pillar_id_2"],
    "families": ["F1", "F5"],
    "target_asset_count": 20,
    "timeline_days": 14
  },
  "budget_constraint_usd": 500
}
```

### Forecast Response

```json
{
  "forecast_id": "uuid",
  "projected_spend_usd": 380.00,
  "provider_load": {
    "kling_ai": { "jobs": 12, "utilization_pct": 45 },
    "elevenlabs": { "jobs": 8, "utilization_pct": 20 }
  },
  "sla_risk_score": 0.35,
  "family_utilization": {
    "F1": 0.60,
    "F5": 0.40
  },
  "bottleneck_provider": "kling_ai",
  "recommendation": "Consider spreading F5 jobs across 2 weeks to reduce provider load"
}
```

### Forecast Storage

```sql
CREATE TABLE forecast_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  inputs JSONB NOT NULL,
  outputs JSONB NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Plan Templates & Playbooks (Phase 3A)

Reusable campaign blueprints that can be instantiated with brand-specific overrides.

### Template Schema

```json
{
  "template_id": "uuid",
  "name": "Product Launch — E-commerce",
  "vertical": "e-commerce",
  "description": "4-week product launch campaign with hero video, social posts, and ad variants",
  "family_mix": {
    "F3": 0.20,
    "F4": 0.40,
    "F5": 0.15,
    "F7": 0.25
  },
  "platform_distribution": {
    "instagram": 0.35,
    "tiktok": 0.30,
    "facebook": 0.15,
    "youtube": 0.20
  },
  "pillar_structure": [
    { "name": "Product Features", "weight": 0.4 },
    { "name": "Social Proof", "weight": 0.3 },
    { "name": "Brand Story", "weight": 0.3 }
  ],
  "default_tier": "standard",
  "approval_policy_preset": "uuid | null",
  "estimated_cost_range_usd": { "min": 200, "max": 600 },
  "target_asset_count": 24,
  "duration_weeks": 4,
  "created_by": "system | user_id",
  "is_marketplace": true
}
```

### Template Instantiation

```
Template → clone into new strategy_plan
  ├── Apply brand-specific overrides (brand_id, budget, dates)
  ├── Resolve pillar names to brand pillars (or create new)
  ├── Attach approval policy (from preset or brand default)
  └── Queue initiatives per weekly schedule
```

### Database Schema

```sql
CREATE TABLE plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vertical TEXT,
  description TEXT,
  family_mix JSONB NOT NULL DEFAULT '{}',
  platform_distribution JSONB NOT NULL DEFAULT '{}',
  pillar_structure JSONB NOT NULL DEFAULT '[]',
  default_tier TEXT DEFAULT 'standard',
  approval_policy_preset UUID,
  estimated_cost_range JSONB DEFAULT '{}',
  target_asset_count INTEGER,
  duration_weeks INTEGER,
  created_by TEXT NOT NULL,
  is_marketplace BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Schedule Conflict Resolution (Phase 3C)

The Strategy Engine detects and resolves scheduling conflicts before finalizing weekly schedules.

### Conflict Types

| Type | Detection | Resolution |
|------|-----------|------------|
| Same platform, same time | Two slots target identical platform + time window | `shift_time`: move one slot by 2 hours |
| Platform saturation | > N posts per platform per day | `drop_lower_priority`: defer lowest priority slot |
| Provider contention | Multiple slots require same provider simultaneously | `stagger`: spread across available windows |

### Conflict Resolution Strategies

| Strategy | Behavior |
|----------|----------|
| `shift_time` | Move conflicting slot to next available window |
| `merge_slot` | Combine two related slots (same pillar) into single multi-format post |
| `drop_lower_priority` | Defer lower-priority slot to next day |
| `stagger` | Distribute slots across day to avoid provider contention |

### Platform Posting Limits (Configurable per Brand)

| Platform | Default Max/Day | Recommended |
|----------|----------------|-------------|
| Instagram | 3 | 1-2 |
| TikTok | 4 | 2-3 |
| YouTube | 1 | 1 |
| LinkedIn | 2 | 1 |
| Twitter | 5 | 3-4 |
| Facebook | 3 | 1-2 |
| Pinterest | 10 | 5-8 |

---

## Cross-Brand Portfolio View (Phase 3D)

Agency-tier capability for managing multiple brands from a unified view.

### Portfolio Schema

```json
{
  "portfolio_id": "uuid",
  "organization_id": "uuid",
  "name": "Agency Portfolio",
  "brands": ["brand_id_1", "brand_id_2"],
  "aggregate_budget_cap_usd": 5000,
  "aggregate_consumed_usd": 1200,
  "shared_template_library": true,
  "created_at": "ISO 8601"
}
```

### Portfolio Metrics

```sql
CREATE MATERIALIZED VIEW mv_portfolio_health AS
SELECT
  p.organization_id,
  b.brand_id,
  COUNT(po.id) AS total_initiatives,
  SUM(CASE WHEN po.status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
  SUM(CASE WHEN po.status = 'blocked_budget' THEN 1 ELSE 0 END) AS budget_blocked,
  AVG(js.cost) AS avg_cost_per_initiative,
  SUM(js.cost) AS total_spend
FROM portfolios p
JOIN brands b ON b.organization_id = p.organization_id
JOIN plan_objects po ON po.brand_id = b.brand_id
LEFT JOIN job_stages js ON js.job_id = po.initiative_id
GROUP BY p.organization_id, b.brand_id;
```

---

## Database Schema (Core)

```sql
CREATE TABLE strategy_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'weekly',
  vertical_profile JSONB NOT NULL,
  content_pillars JSONB NOT NULL DEFAULT '[]',
  family_distribution JSONB DEFAULT '{}',
  platform_distribution JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE strategy_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES strategy_plans(id) NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Sunday
  time_utc TIME NOT NULL,
  platform TEXT NOT NULL,
  pillar_id UUID,
  family TEXT NOT NULL,
  format TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  initiative_id UUID, -- links to queued initiative
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE trend_injections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES strategy_plans(id) NOT NULL,
  source TEXT NOT NULL,
  topic TEXT NOT NULL,
  relevance_score NUMERIC DEFAULT 0,
  mapped_to_pillar UUID,
  mapped_to_slot UUID REFERENCES strategy_slots(id),
  status TEXT DEFAULT 'suggested',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE provider_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  model TEXT NOT NULL,
  rate_limit_rpm INTEGER NOT NULL DEFAULT 60,
  max_concurrent_jobs INTEGER NOT NULL DEFAULT 10,
  current_queue_depth INTEGER NOT NULL DEFAULT 0,
  avg_job_duration_s INTEGER DEFAULT 120,
  status TEXT NOT NULL DEFAULT 'available',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (provider_id, model)
);
```
