# Template Library Operations — Technical Reference

> **Status**: Design reference — not yet implemented  
> **Owner**: F8 Creative Cloner + Image Template Engine  
> **Purpose**: Curate, score, and manage the template library to avoid cold-start and maintain quality

---

## Overview

The Creative Cloner (F8) and Image Template Engine depend on a rich template library. Without sufficient templates at launch, these pipelines produce limited variety. This document defines the 50-template launch target, 10 content categories, scoring system, and curation workflow.

---

## Launch Target: 50 Templates

### Categories (10)

| # | Category | Description | Target Count |
|---|----------|-------------|-------------|
| 1 | UGC Testimonial | Person holding/using product, casual setting | 6 |
| 2 | Product Reveal | Dramatic product unveiling, unboxing | 5 |
| 3 | Offer Announcement | Sale/discount graphic with bold typography | 5 |
| 4 | Founder Story | Founder speaking to camera, personal narrative | 5 |
| 5 | Before-After | Split-screen transformation | 5 |
| 6 | Listicle Carousel | Multi-slide tips/tricks/list format | 5 |
| 7 | Problem-Solution | Pain point → product solution narrative | 5 |
| 8 | Seasonal Promo | Holiday/seasonal themed creative | 4 |
| 9 | Feature Spotlight | Single feature deep-dive with demo | 5 |
| 10 | Educational Micro-Content | Quick how-to or explainer | 5 |

---

## Template Schema

```json
{
  "template_id": "uuid",
  "name": "UGC Kitchen Testimonial",
  "category": "ugc_testimonial",
  "description": "Person in kitchen holding product, speaking casually to camera",
  "base_prompt": "A young woman in a modern kitchen, holding {{product}} at chest height, speaking directly to camera with genuine excitement. Natural window lighting, iPhone selfie style, slightly messy countertop in background. Amateur quality, authentic feel.",
  "sealcam_fields": {
    "subject": "Young woman holding {{product}}",
    "environment": "Modern kitchen, natural window lighting",
    "action": "Speaking to camera, holding product",
    "lighting": "Natural daylight from window, warm tones",
    "camera": "iPhone selfie, slight upward angle, casual framing",
    "metatokens": "authentic_ugc, amateur_quality, natural_skin_texture"
  },
  "platform_compatibility": ["instagram_reel", "tiktok", "youtube_shorts"],
  "aspect_ratios": ["9:16"],
  "industry_tags": ["beauty", "skincare", "food", "wellness"],
  "mood_tags": ["casual", "authentic", "warm"],
  "template_quality_score": 8.5,
  "template_usage_frequency": 0,
  "template_conversion_rank": null,
  "created_at": "2026-03-31T00:00:00Z",
  "status": "active"
}
```

---

## Scoring System

### Template Quality Score (Manual, 1-10)

Scored by content team during curation review:

| Score | Criteria |
|-------|----------|
| 9-10 | Exceptional — produces consistently high-quality output across brands |
| 7-8 | Good — reliable results with minor prompt tuning |
| 5-6 | Acceptable — works but may need brand-specific adjustments |
| 3-4 | Below average — inconsistent results |
| 1-2 | Poor — frequently produces artifacts or off-brand output |

### Template Usage Frequency (Auto-tracked)

Incremented each time a template is selected for generation:
```sql
UPDATE image_templates SET template_usage_frequency = template_usage_frequency + 1
WHERE template_id = $1;
```

### Template Conversion Rank (Derived)

Calculated from downstream engagement metrics when social publishing data is available:
```
conversion_rank = (engagement_rate of posts using this template) / (avg engagement_rate across all templates)
```

Values > 1.0 indicate above-average performance.

---

## Curation Workflow

```text
1. SOURCE: Identify high-performing ad creative from competitors/industry
2. ANALYZE: Break down into SEALCaM fields + identify transferable patterns
3. WRITE: Create base_prompt with {{product}} placeholder
4. TAG: Assign category, industry_tags, mood_tags, platform_compatibility
5. TEST: Generate 3 test outputs with different products/brands
6. SCORE: Rate template_quality_score based on test results
7. REVIEW: Content team approval (quality >= 7 required for launch)
8. SEED: Insert into image_templates table with status: active
```

---

## Retirement Policy

Templates are archived (not deleted) based on:

| Condition | Action |
|-----------|--------|
| `usage_count < 5` after 30 days active | Archive (low adoption) |
| `conversion_rank < 0.5` after 50+ uses | Archive (underperforming) |
| `quality_score` downgraded below 5 | Archive (quality decline) |
| User reports consistent poor output | Review → potential archive |

Archived templates remain in the database with `status: archived` for analytics.

---

## Database Schema

```sql
CREATE TABLE image_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  base_prompt TEXT NOT NULL,
  sealcam_fields JSONB,
  platform_compatibility TEXT[] DEFAULT '{}',
  aspect_ratios TEXT[] DEFAULT '{}',
  industry_tags TEXT[] DEFAULT '{}',
  mood_tags TEXT[] DEFAULT '{}',
  template_quality_score NUMERIC(3,1) DEFAULT 0,
  template_usage_frequency INTEGER DEFAULT 0,
  template_conversion_rank NUMERIC(5,3) DEFAULT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_templates_category ON image_templates (category);
CREATE INDEX idx_templates_industry ON image_templates USING GIN (industry_tags);
CREATE INDEX idx_templates_status ON image_templates (status);
```

---

## Key Design Notes

1. **50 templates is the minimum viable launch** — below this, users see too little variety
2. **{{product}} placeholder** is the standard substitution variable in all templates
3. **SEALCaM fields enable cross-family reuse** — same template works in F5, F7, F8
4. **Industry tags use array overlap queries** (`&&` operator) for flexible matching
5. **Conversion rank requires social publishing integration** — null until engagement data flows back
