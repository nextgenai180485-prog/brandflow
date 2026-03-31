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

## Database Schema

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
```
