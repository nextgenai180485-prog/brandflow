# Brand Memory Engine

> **Status**: Design reference  
> **Last updated**: 2026-04-03  
> **Owner**: Cross-family  
> **Depends on**: Module #22 (Performance Feedback Engine), Module #19 (Review Packet Engine)

---

## Purpose

Store and retrieve long-term brand-specific intelligence. This engine accumulates knowledge about what works for each brand over time — approved hooks, rejected approaches, winning formats, visual preferences, do-not-use patterns, and campaign history.

Without this engine, every generation request starts from zero. The system has no memory of what the brand has approved, rejected, or performed well with. This is the architectural home for the "learning loop" that makes Brandflow smarter per brand over time.

---

## Memory Categories

### 1. Approval Memory

Tracks what the brand's reviewers approve and reject:

```json
{
  "approval_memory": {
    "brand_id": "uuid",
    "approved_hooks": [
      { "hook_id": "uuid", "hook_style": "question", "approved_count": 12, "last_approved": "ISO 8601" }
    ],
    "rejected_hooks": [
      { "hook_id": "uuid", "hook_style": "urgency", "rejected_count": 5, "rejection_reasons": ["too aggressive", "off-brand"] }
    ],
    "approved_angles": [
      { "angle": "transformation", "approved_count": 8, "avg_engagement_score": 76 }
    ],
    "rejected_angles": [
      { "angle": "fear_based", "rejected_count": 3, "rejection_reasons": ["not aligned with brand values"] }
    ],
    "approval_acceptance_rate": 0.78,
    "avg_revision_rounds": 1.2,
    "common_revision_reasons": ["tone too formal", "missing product close-up", "CTA too aggressive"]
  }
}
```

### 2. Asset Memory

Tracks which generated assets have been approved and can be reused:

```json
{
  "asset_memory": {
    "brand_id": "uuid",
    "reusable_assets": [
      {
        "artifact_id": "uuid",
        "family": "F1",
        "type": "video",
        "approved_at": "ISO 8601",
        "engagement_score": 82,
        "reuse_count": 3,
        "tags": ["product_showcase", "before_after"]
      }
    ],
    "do_not_reuse": [
      {
        "artifact_id": "uuid",
        "reason": "outdated product image",
        "flagged_at": "ISO 8601"
      }
    ]
  }
}
```

### 3. Preference Memory

Tracks learned preferences from approval/rejection patterns:

```json
{
  "preference_memory": {
    "brand_id": "uuid",

    "format_preferences": {
      "preferred": ["reel", "carousel"],
      "avoided": ["long_form_video"],
      "confidence": 0.82
    },

    "visual_style_preferences": {
      "preferred_lighting": "warm, natural",
      "preferred_color_palette": "soft pastels, brand colors",
      "avoided_styles": ["dark moody", "high contrast"],
      "confidence": 0.75
    },

    "voice_preferences": {
      "preferred_tone": "warm, conversational",
      "avoided_tone": "corporate, stiff",
      "preferred_cta_style": "soft",
      "emoji_tolerance": "moderate",
      "confidence": 0.80
    },

    "platform_preferences": {
      "primary_focus": "instagram",
      "secondary": "tiktok",
      "low_priority": ["linkedin", "twitter"],
      "confidence": 0.70
    }
  }
}
```

### 4. Creative History

Full history of what has been generated for this brand:

```json
{
  "creative_history": {
    "brand_id": "uuid",
    "total_jobs": 156,
    "total_approved": 122,
    "total_rejected": 18,
    "total_revised": 16,

    "family_usage": {
      "F1": { "count": 45, "approval_rate": 0.82 },
      "F4": { "count": 67, "approval_rate": 0.91 },
      "F5": { "count": 12, "approval_rate": 0.67 }
    },

    "campaign_history": [
      {
        "campaign_id": "uuid",
        "name": "Summer Glow Campaign",
        "assets_generated": 24,
        "assets_approved": 20,
        "avg_engagement_score": 74,
        "best_performing_asset": "artifact_id"
      }
    ]
  }
}
```

### 5. Do-Not-Use Registry

Explicit patterns the brand has flagged or that have been learned from rejections:

```json
{
  "do_not_use": {
    "brand_id": "uuid",
    "patterns": [
      {
        "type": "hook_style",
        "value": "urgency",
        "reason": "Brand owner finds urgency hooks pushy",
        "source": "rejection_pattern (5 rejections)",
        "added_at": "ISO 8601"
      },
      {
        "type": "visual_element",
        "value": "before/after split screen",
        "reason": "Compliance concern in medspa vertical",
        "source": "manual_flag",
        "added_at": "ISO 8601"
      },
      {
        "type": "phrase",
        "value": "limited time offer",
        "reason": "Brand prefers soft sell approach",
        "source": "revision_pattern",
        "added_at": "ISO 8601"
      }
    ]
  }
}
```

---

## Memory Update Triggers

| Trigger | Memory Updated | Source |
|---------|---------------|--------|
| Review packet approved | Approval memory (approved hooks, angles) | Review Packet Engine (#19) |
| Review packet rejected | Approval memory (rejected hooks, reasons) | Review Packet Engine (#19) |
| Revision requested | Preference memory (revision reasons → style adjustments) | Revision Agent (#3) |
| Performance signal received | Asset memory (engagement scores), creative history | Performance Feedback (#22) |
| User explicitly flags "do not use" | Do-not-use registry | User action |
| 5+ rejections of same pattern | Do-not-use registry (auto-detected) | Pattern analysis |
| Campaign completed | Creative history (campaign summary) | Strategy Engine (#21) |

---

## Memory Query Interface

```json
{
  "memory_query": {
    "brand_id": "uuid",
    "query_type": "full | approval | preferences | do_not_use | assets | history",
    "filters": {
      "time_window_days": 90,
      "family": "F1 | F5 | null (all)",
      "platform": "instagram | null (all)",
      "min_confidence": 0.70
    }
  }
}
```

---

## Consumers

| Consumer | What They Query |
|----------|----------------|
| Decision Engine (#26) | Full memory — approval patterns, preferences, do-not-use |
| Research Engine (#25) | Historical performance signals, reusable assets |
| Creative Direction (#23) | Visual/voice preferences, do-not-use patterns |
| Creative Director Agent (#1) | Approved hooks/angles, rejection reasons |
| Strategy Engine (#21) | Campaign history, family usage patterns |
| Trust & Explainability Engine | Memory-sourced evidence for decision rationale |

---

## Database Schema

```sql
CREATE TABLE brand_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  memory_type TEXT NOT NULL, -- 'approval' | 'preference' | 'do_not_use' | 'creative_history'
  data JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC DEFAULT 0.5,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (brand_id, memory_type)
);

CREATE TABLE asset_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  artifact_id UUID NOT NULL,
  family TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- 'video' | 'image' | 'audio'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'do_not_reuse' | 'archived'
  engagement_score NUMERIC,
  reuse_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE creative_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  job_id UUID NOT NULL,
  family TEXT NOT NULL,
  angle TEXT,
  hook_style TEXT,
  platform TEXT,
  outcome TEXT NOT NULL, -- 'approved' | 'rejected' | 'revised'
  engagement_score NUMERIC,
  revision_count INTEGER DEFAULT 0,
  revision_reasons TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_preference_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  preference_type TEXT NOT NULL, -- 'format' | 'visual_style' | 'voice' | 'platform' | 'hook_style'
  preferred JSONB DEFAULT '[]',
  avoided JSONB DEFAULT '[]',
  confidence NUMERIC DEFAULT 0.5,
  sample_size INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (brand_id, preference_type)
);

CREATE TABLE do_not_use_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  pattern_type TEXT NOT NULL, -- 'hook_style' | 'visual_element' | 'phrase' | 'angle' | 'color' | 'format'
  pattern_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL, -- 'manual_flag' | 'rejection_pattern' | 'revision_pattern' | 'compliance'
  added_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_brand_memory_brand ON brand_memory(brand_id);
CREATE INDEX idx_asset_memory_brand ON asset_memory(brand_id);
CREATE INDEX idx_asset_memory_reuse ON asset_memory(brand_id, status, engagement_score DESC);
CREATE INDEX idx_creative_history_brand ON creative_history(brand_id, created_at DESC);
CREATE INDEX idx_creative_history_outcome ON creative_history(brand_id, outcome);
CREATE INDEX idx_user_pref_brand ON user_preference_memory(brand_id);
CREATE INDEX idx_dnu_brand ON do_not_use_registry(brand_id);
```
