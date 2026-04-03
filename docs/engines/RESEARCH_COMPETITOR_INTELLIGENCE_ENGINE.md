# Module #25 — Research & Competitor Intelligence Engine

> **Status**: Design reference  
> **Last updated**: 2026-04-03  
> **Owner**: Cross-family  
> **Depends on**: Module #21 (Strategy Engine), Module #12 (Brand Voice DNA)

---

## Purpose

Gather external market context before creative reasoning begins. This engine is the architectural home for all deep_search-style research integration. No generation family should call external research directly — all market intelligence flows through this engine.

Without this engine, Brandflow generates in a vacuum — no competitor awareness, no category norms, no market context. Content is technically correct but commercially blind.

---

## Responsibilities

| Responsibility | Description |
|----------------|-------------|
| Competitor Discovery | Identify direct and adjacent competitors from brand vertical + product category |
| Competitor Creative Pattern Extraction | Analyze competitor social content for hook types, posting cadence, visual style, engagement patterns |
| Category Norms | Establish baseline metrics and content patterns for the brand's vertical |
| Premium Signals | Identify high-performing creative patterns worth emulating |
| Trend Signals | Surface current platform-native trends relevant to the brand's category |
| Visual Cliché Avoidance | Flag overused visual conventions to prevent generic output |
| Audience Expectation Summaries | Synthesize what the target audience expects from this category on each platform |
| Platform Behavior Summaries | Provide platform-specific creative heuristics (what works on TikTok vs LinkedIn) |

---

## Inputs

```json
{
  "research_request": {
    "brand_id": "uuid",
    "initiative_id": "uuid",
    "vertical": "medspa | ecommerce | saas | restaurant | fitness | beauty | ...",
    "product_service": "string — what the brand sells",
    "target_audience": "string — who they're trying to reach",
    "platform_targets": ["instagram", "tiktok", "linkedin", "..."],
    "campaign_objective": "awareness | engagement | conversion | retention",
    "competitor_handles": ["@handle1", "@handle2"],
    "research_mode": "cached | fresh",
    "freshness_max_hours": 168
  }
}
```

---

## Outputs

### Internal Intelligence Brief

```json
{
  "internal_intelligence_brief": {
    "brief_id": "uuid",
    "brand_id": "uuid",
    "initiative_id": "uuid",
    "created_at": "ISO 8601",
    "research_mode": "cached | fresh",
    "cache_age_hours": "number | null",

    "brand_summary": {
      "name": "string",
      "vertical": "string",
      "positioning": "string",
      "voice_profile_ref": "uuid (brand_voice_profile)"
    },

    "current_offer": {
      "product_service": "string",
      "value_proposition": "string",
      "price_point": "string | null",
      "seasonal_relevance": "string | null"
    },

    "target_audience": {
      "primary": "string",
      "pain_points": ["string"],
      "aspirations": ["string"],
      "platform_behavior": {
        "instagram": "string — how this audience uses IG",
        "tiktok": "string — how this audience uses TikTok"
      }
    },

    "target_channels": ["instagram", "tiktok"],

    "campaign_goal": "awareness | engagement | conversion | retention",

    "category_patterns": {
      "dominant_content_types": ["short_video", "carousel", "static_image"],
      "dominant_hook_styles": ["question", "before_after", "statistic"],
      "posting_cadence_norm": "5-7 posts/week",
      "visual_conventions": ["clean backgrounds", "warm lighting", "before/after grids"],
      "visual_cliches_to_avoid": ["generic stock feel", "overused transition templates"],
      "engagement_benchmarks": {
        "likes_rate": 0.035,
        "comments_rate": 0.008,
        "saves_rate": 0.012
      }
    },

    "competitor_patterns": [
      {
        "handle": "@competitor1",
        "posting_frequency": "daily",
        "top_hook_styles": ["question", "transformation"],
        "avg_engagement_rate": 0.042,
        "top_performing_formats": ["reels", "carousels"],
        "weak_spots": ["no video content", "inconsistent posting"],
        "visual_style": "clinical, bright, before/after focused"
      }
    ],

    "opportunity_gap": {
      "underserved_formats": ["UGC-style testimonials", "behind-the-scenes"],
      "underserved_hooks": ["challenge", "myth_busting"],
      "positioning_opportunity": "string — where brand can differentiate",
      "timing_opportunity": "string — seasonal/trend-based windows"
    },

    "reusable_assets_available": {
      "product_images": "number",
      "brand_elements": "number",
      "prior_approved_content": "number",
      "voice_presets": "number"
    },

    "historical_performance_signals": {
      "best_performing_hook_style": "question",
      "best_performing_platform": "instagram",
      "best_performing_format": "reel",
      "avg_engagement_score": 72,
      "sample_size": 45
    },

    "confidence_score": 0.82
  }
}
```

---

## Research Modes

| Mode | Behavior | Cost | Latency |
|------|----------|------|---------|
| `cached` | Return cached intelligence if within `freshness_max_hours` | Free | < 100ms |
| `fresh` | Run new Firecrawl scrapes + Gemini analysis, then cache results | $0.05–$0.15 | 5–15s |

---

## Research Pipeline

```
Research Request
  │
  ├─── Cache Check
  │      └─ Query category_intelligence_cache for matching vertical + platform + region
  │      └─ If cache hit within freshness window → return cached brief
  │
  ├─── Competitor Scraping (if fresh or cache miss)
  │      └─ Firecrawl scrape of competitor public profiles
  │      └─ Extract: posting frequency, hook types, engagement rates, visual style
  │      └─ Gemini classification of competitor content patterns
  │
  ├─── Category Intelligence (if fresh or cache miss)
  │      └─ Aggregate category norms from Hook Library data
  │      └─ Cross-reference with platform trend signals
  │      └─ Identify visual conventions and clichés
  │
  ├─── Historical Performance Lookup
  │      └─ Query brand_memory for prior performance signals
  │      └─ Query Performance Feedback Engine (#22) for recent metrics
  │
  ├─── Brief Assembly
  │      └─ Compile all signals into internal_intelligence_brief.json
  │      └─ Calculate confidence_score based on data freshness and sample size
  │
  └─── Cache Update
         └─ Store assembled intelligence in category_intelligence_cache
         └─ Store brand-specific intelligence in brand_memory
```

---

## Integration Points

| Engine | Interaction |
|--------|------------|
| #21 Strategy Engine | Produces plan_object that triggers research request; research enriches plan context |
| #23 Creative Direction Engine | Consumes internal_intelligence_brief to inform ad angle, hook logic, scene architecture |
| #1 Creative Director Agent | Can query research engine for competitor context during creative planning |
| #11 Hook Library | Research feeds competitor hook patterns into library; library data feeds back into category norms |
| #22 Performance Feedback | Historical performance signals feed into the brief |
| #26 Decision Engine | Consumes full intelligence brief for strategic decisioning |
| Brand Memory Engine | Historical brand data feeds into brief; new intelligence updates memory |
| Category Intelligence Cache | Primary cache layer for reusable vertical/category data |

---

## Cross-Family Adoption

All families benefit from market context:

| Family | Usage |
|--------|-------|
| F1 UGC Video | ✅ Competitor UGC patterns, audience expectations |
| F2 AI Spokesperson | ✅ Authority positioning, category messaging norms |
| F3 Product Videography | ✅ Product showcase conventions, competitor visual style |
| F4 Social Content | ✅ Platform-specific content patterns, hook effectiveness |
| F5 Cinematic Ad | ✅ Premium ad conventions, competitor ad analysis |
| F6 Core Elements Board | — (asset prep, no market context needed) |
| F7 Ad Creator | ✅ Ad format patterns, competitor ad styles |
| F8 Creative Cloner | ✅ Reference context for cloning decisions |
| F9 Image Template | ✅ Visual style trends, template pattern relevance |

---

## Important Architectural Rules

1. **No direct research calls from families** — All external research flows through this engine
2. **Cache-first** — Always check cache before running fresh research
3. **Confidence-scored** — Every brief includes a confidence score; downstream engines can request fresh research if confidence is below threshold
4. **Cost-aware** — Fresh research has real Firecrawl + LLM costs; system should default to cached when adequate
5. **Privacy-safe** — Only scrape public profiles; no private data collection

---

## Database Schema

```sql
CREATE TABLE intelligence_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  initiative_id UUID,
  research_mode TEXT NOT NULL, -- 'cached' | 'fresh'
  brief JSONB NOT NULL,
  confidence_score NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_intel_briefs_brand ON intelligence_briefs(brand_id);
CREATE INDEX idx_intel_briefs_initiative ON intelligence_briefs(initiative_id);
```
