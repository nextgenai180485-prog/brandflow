# Category Intelligence Cache

> **Status**: Design reference  
> **Last updated**: 2026-04-03  
> **Owner**: Cross-family  
> **Depends on**: Module #25 (Research & Competitor Intelligence Engine)

---

## Purpose

Reduce research cost and latency by caching reusable vertical/category intelligence. Most category-level insights (hook patterns per vertical, platform-specific heuristics, visual conventions) change slowly and can be reused across brands in the same vertical.

---

## Cache Structure

```json
{
  "cache_entry": {
    "cache_id": "uuid",
    "vertical": "medspa | ecommerce | saas | restaurant | fitness | beauty | luxury | health",
    "platform": "instagram | tiktok | youtube | linkedin | twitter | facebook | pinterest",
    "region": "us | eu | uk | mena | apac | latam | global",

    "category_norms": {
      "dominant_content_types": ["short_video", "carousel", "static_image"],
      "dominant_hook_styles": ["question", "before_after", "statistic"],
      "posting_cadence_norm": "5-7 posts/week",
      "visual_conventions": ["string"],
      "visual_cliches": ["string"],
      "engagement_benchmarks": {
        "likes_rate": "number",
        "comments_rate": "number",
        "saves_rate": "number",
        "completion_rate": "number | null"
      }
    },

    "platform_heuristics": {
      "best_posting_times": ["string"],
      "optimal_duration_s": "number",
      "preferred_aspect_ratio": "9:16 | 1:1 | 4:5",
      "native_features_to_use": ["string"],
      "algorithm_signals": ["string"]
    },

    "freshness": {
      "collected_at": "ISO 8601",
      "expires_at": "ISO 8601",
      "freshness_window_hours": 168,
      "source_count": "number — how many data points contributed",
      "confidence_score": "number (0-1)"
    }
  }
}
```

---

## Cache Examples

| Vertical | Platform | Example Cached Intelligence |
|----------|----------|-----------------------------|
| Medspa | Instagram | Hook patterns: before/after dominates; visual conventions: bright clinical settings; posting cadence: 5-7/week |
| Ecommerce | TikTok | Hook patterns: unboxing, lifestyle demos; visual conventions: user-generated feel; optimal duration: 15-30s |
| Luxury Skincare | Instagram | Visual conventions: soft lighting, minimal text, aspirational settings; cliché: avoid generic "glow" imagery |
| SaaS | LinkedIn | Hook patterns: statistic-led, contrarian take; posting cadence: 3-5/week; visual: clean data visualizations |

---

## Cache Policies

### Freshness Windows

| Data Type | Default Window | Rationale |
|-----------|---------------|-----------|
| Category norms | 7 days (168h) | Vertical patterns change slowly |
| Platform heuristics | 3 days (72h) | Algorithm changes happen periodically |
| Competitor patterns | 24 hours | Competitor activity can change daily |
| Trend signals | 6 hours | Trends are time-sensitive |

### Invalidation Rules

| Trigger | Action |
|---------|--------|
| Freshness window exceeded | Mark as stale; next request triggers fresh collection |
| Manual refresh request | Force re-collection regardless of window |
| Performance Feedback signals shift > 20% | Auto-invalidate related cache entries |
| New vertical onboarded with < 5 brands | Low-confidence flag; prefer fresh research |

### Confidence Scoring

| Condition | Confidence Impact |
|-----------|------------------|
| Source count > 50 data points | +0.15 |
| Data < 24h old | +0.10 |
| Data 1-7 days old | +0.00 |
| Data > 7 days old | -0.15 |
| Vertical has < 10 brands in system | -0.10 |
| Cross-validated with Performance Feedback data | +0.10 |

---

## Consumers

| Consumer | What They Query |
|----------|----------------|
| Research Engine (#25) | Full cache entry for pre-brief assembly |
| Decision Engine (#26) | Category norms for strategy validation |
| Creative Direction (#23) | Visual conventions and clichés for scene planning |
| Hook Library (#11) | Dominant hook styles for weight calibration |

---

## Database Schema

```sql
CREATE TABLE category_intelligence_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical TEXT NOT NULL,
  platform TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'global',
  category_norms JSONB NOT NULL DEFAULT '{}',
  platform_heuristics JSONB NOT NULL DEFAULT '{}',
  source_count INTEGER NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  collected_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (vertical, platform, region)
);

CREATE INDEX idx_cat_intel_vertical ON category_intelligence_cache(vertical);
CREATE INDEX idx_cat_intel_lookup ON category_intelligence_cache(vertical, platform, region);
CREATE INDEX idx_cat_intel_freshness ON category_intelligence_cache(expires_at);
```
