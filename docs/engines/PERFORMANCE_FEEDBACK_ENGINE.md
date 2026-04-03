# Module #22 — Performance & Preference Feedback Engine

> **Status**: Design reference  
> **Last updated**: 2026-04-03  
> **Owner**: Cross-family  
> **Depends on**: Module #21 (Strategy Engine), Module #11 (Hook Library), Module #9 (Provider & Tier Routing), Module #26 (Decision Engine), Brand Memory Engine

---

## Purpose

Close the learning loop. Every asset Brandflow produces should feed performance data AND user preference signals back into the system so that future content improves automatically. Without this engine, Brandflow generates blind — no learning, no optimization, no compounding value.

The Performance & Preference Feedback Engine ingests engagement metrics, approval/rejection patterns, variant outcomes, and user preference signals. It emits adjustment signals that retune Hook Library weights, Template Library priorities, family routing preferences, Strategy Engine pillar distributions, Decision Engine confidence, and Brand Memory.

---

## Responsibilities

| Responsibility | Description |
|----------------|-------------|
| Engagement Metric Ingestion | Pull post-publish performance data from connected platforms via Social Publishing Engine (#27) |
| Variant Performance Scoring | Rank A/B variants and multiplication outputs by effectiveness |
| Hook Effectiveness Tracking | Score which hook styles drive engagement per platform/vertical |
| Template Success Weighting | Track which templates produce high-performing assets |
| Provider Output Quality Tracking | Score provider outputs by downstream engagement (not just generation quality) |
| Strategy Adjustment Signals | Emit rebalancing signals to Strategy Engine (#21) |
| Approval/Rejection Learning | Track approval_acceptance_rate, revision_patterns, and rejection reasons per brand |
| Variant Winner Loop | Identify which A/B variant won and feed winner data back to Campaign Multiplication |
| User Preference Learning | Detect format, visual style, hook, and tone preferences from approval/rejection patterns |
| Family Routing Feedback | Track which families produce highest-approved content per brand/vertical |
| Asset Reuse Success Tracking | Monitor whether reused assets maintain engagement vs. fresh generation |

---

## Performance Signal Schema

```json
{
  "performance_signal": {
    "signal_id": "uuid",
    "asset_id": "uuid",
    "initiative_id": "uuid",
    "job_id": "uuid",
    "family": "F1 | F2 | F3 | F4 | F5 | F7 | F8 | F9",
    "platform": "instagram | tiktok | youtube | linkedin | twitter | facebook | pinterest",
    "published_at": "ISO 8601",
    "collected_at": "ISO 8601",

    "metrics": {
      "impressions": "number",
      "reach": "number",
      "likes": "number",
      "comments": "number",
      "shares": "number",
      "saves": "number",
      "clicks": "number",
      "watch_time_s": "number | null",
      "completion_rate": "number (0-1) | null",
      "ctr": "number (0-1) | null"
    },

    "scores": {
      "engagement_score": "number (0-100)",
      "hook_score": "number (0-100)",
      "conversion_signal": "number (0-100)",
      "retention_signal": "number (0-100)",
      "variant_rank": "number (1-N within test pack)"
    },

    "context": {
      "hook_style": "question | statistic | bold_claim | story | challenge",
      "hook_id": "uuid | null",
      "template_id": "uuid | null",
      "provider_used": "string",
      "generation_tier": "draft | standard | premium",
      "pillar_id": "uuid | null",
      "campaign_track_id": "uuid | null"
    }
  }
}
```

---

## Score Calculation

### Engagement Score (0-100)

Platform-normalized composite:

```
engagement_score = weighted_sum(
  likes_rate     × 0.15,
  comments_rate  × 0.25,
  shares_rate    × 0.25,
  saves_rate     × 0.20,
  completion_rate × 0.15
) × 100
```

Rates are calculated as metric / impressions, then normalized against platform-specific benchmarks per vertical.

### Hook Score (0-100)

Measures opening effectiveness:

```
hook_score = weighted_sum(
  3s_retention_rate × 0.40,
  completion_rate   × 0.30,
  engagement_score  × 0.30
) × 100
```

### Conversion Signal (0-100)

```
conversion_signal = weighted_sum(
  ctr          × 0.50,
  clicks       × 0.30,
  saves_rate   × 0.20
) × 100
```

---

## Output Signals

### 1. Hook Weight Updates → Module #11

```json
{
  "signal_type": "hook_weight_update",
  "target": "hook_library",
  "updates": [
    {
      "hook_style": "question",
      "platform": "tiktok",
      "vertical": "ecommerce",
      "current_weight": 0.25,
      "new_weight": 0.32,
      "evidence": {
        "sample_size": 47,
        "avg_hook_score": 78,
        "confidence": 0.85
      }
    }
  ]
}
```

### 2. Template Priority Updates → Template Library

```json
{
  "signal_type": "template_priority_update",
  "target": "template_library",
  "updates": [
    {
      "template_id": "uuid",
      "current_score": 72,
      "new_score": 81,
      "usage_count": 34,
      "avg_engagement_score": 81
    }
  ]
}
```

### 3. Family Routing Adjustments → Module #9

```json
{
  "signal_type": "family_routing_adjustment",
  "target": "provider_routing",
  "updates": [
    {
      "family": "F1",
      "platform": "tiktok",
      "current_preference": 0.15,
      "recommended_preference": 0.22,
      "reason": "F1 UGC outperforms F7 Ad Creator on TikTok by 34% engagement"
    }
  ]
}
```

### 4. Strategy Rebalancing Signals → Module #21

```json
{
  "signal_type": "strategy_rebalance",
  "target": "strategy_engine",
  "updates": [
    {
      "pillar_id": "uuid",
      "current_weight": 0.20,
      "recommended_weight": 0.28,
      "reason": "Pillar 'behind-the-scenes' consistently outperforms 'product-spotlight' by 2.1x"
    }
  ]
}
```

### 5. Decision Engine Signals → Module #26

```json
{
  "signal_type": "decision_confidence_update",
  "target": "decision_engine",
  "updates": [
    {
      "brand_id": "uuid",
      "angle_type": "transformation",
      "current_confidence": 0.75,
      "new_confidence": 0.87,
      "evidence": {
        "approval_rate": 0.82,
        "engagement_rate": 0.045,
        "sample_size": 12
      }
    }
  ]
}
```

### 6. Preference Updates → Brand Memory Engine

```json
{
  "signal_type": "preference_update",
  "target": "brand_memory",
  "updates": [
    {
      "brand_id": "uuid",
      "preference_type": "hook_style",
      "preferred": ["question", "before_after"],
      "avoided": ["urgency"],
      "confidence": 0.82,
      "evidence": {
        "approved_count": 18,
        "rejected_count": 5,
        "sample_size": 23
      }
    }
  ]
}
```

### 7. Approval Pattern Signals → Brand Memory Engine

```json
{
  "signal_type": "approval_pattern",
  "target": "brand_memory",
  "updates": [
    {
      "brand_id": "uuid",
      "approval_acceptance_rate": 0.78,
      "avg_revision_rounds": 1.2,
      "common_revision_reasons": ["tone too formal", "CTA too aggressive"],
      "hook_win_rate": { "question": 0.85, "before_after": 0.80, "urgency": 0.40 },
      "format_preference": { "reel": 0.90, "carousel": 0.85, "static": 0.70 },
      "asset_reuse_success_rate": 0.72
    }
  ]
}
```

---

## Feedback Pipeline

```
Published Asset
  │
  ├─── Metric Collection (T+24h, T+48h, T+7d)
  │      │  Pull metrics from connected platform APIs
  │      │  Store raw metrics in performance_signals table
  │      │
  │      ▼
  ├─── Score Computation
  │      │  Calculate engagement, hook, and conversion scores
  │      │  Normalize against vertical benchmarks
  │      │  Rank variants within test packs
  │      │
  │      ▼
  ├─── Signal Emission
  │      │  Emit hook_weight_updates when confidence > 0.80
  │      │  Emit template_priority_updates when sample_size > 20
  │      │  Emit family_routing_adjustments when delta > 15%
  │      │  Emit strategy_rebalance weekly
  │      │
  │      ▼
  └─── Consumer Application
         Hook Library updates selection weights
         Template Library updates scoring
         Provider Routing adjusts family preferences
         Strategy Engine rebalances pillar weights
```

---

## Collection Windows

| Window | Purpose | Metrics Collected |
|--------|---------|-------------------|
| T+24h | Early signal | Impressions, likes, comments, 3s retention |
| T+48h | Engagement peak | Full engagement metrics, shares, saves |
| T+7d | Settled performance | Completion rate, CTR, conversion signals |
| T+30d | Long-tail | Total reach, saves (evergreen indicator) |

---

## Confidence Thresholds

Signals are only emitted when statistical confidence is sufficient:

| Signal Type | Min Sample Size | Min Confidence |
|-------------|-----------------|----------------|
| Hook weight update | 30 assets with same hook style | 0.80 |
| Template priority update | 20 assets from same template | 0.75 |
| Family routing adjustment | 50 assets per family-platform pair | 0.85 |
| Strategy rebalancing | 4 weeks of data per pillar | 0.80 |

---

## Cross-Family Adoption

| Family | Feedback Role |
|--------|---------------|
| F1 UGC Video | ✅ Video engagement metrics |
| F2 AI Spokesperson | ✅ Watch time, completion rate |
| F3 Product Videography | ✅ Product interest signals |
| F4 Social Content | ✅ Text/image engagement |
| F5 Cinematic Ad | ✅ Premium ad performance |
| F6 Core Elements Board | — (not published content) |
| F7 Ad Creator | ✅ Ad performance metrics |
| F8 Creative Cloner | ✅ Cloned content comparison |
| F9 Image Template | ✅ Static image engagement |

---

## Integration Points

| Engine | Interaction |
|--------|------------|
| #11 Hook Library | Receives hook_weight_updates to adjust selection probabilities |
| #14 Template Image Composer | Receives template_priority_updates for template scoring |
| #9 Provider & Tier Routing | Receives family_routing_adjustments for platform-family preference |
| #21 Strategy Engine | Receives strategy_rebalance signals for pillar and platform redistribution |
| #19 Review Packet Engine | Performance history attached to review packets for context; approval/rejection signals ingested |
| #26 Decision Engine | Receives decision_confidence_updates for angle/hook/family selection calibration |
| #27 Social Publishing Engine | Provides publish metadata (post_id, published_at) for metric collection triggers |
| Brand Memory Engine | Receives preference_updates and approval_pattern signals for long-term brand learning |
| W6 Campaign Multiplication | Variant rank data informs which variants to prioritize in future campaigns |

---

## Database Schema

```sql
CREATE TABLE performance_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL,
  initiative_id UUID,
  job_id UUID,
  family TEXT NOT NULL,
  platform TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ DEFAULT now(),
  collection_window TEXT NOT NULL, -- '24h' | '48h' | '7d' | '30d'
  metrics JSONB NOT NULL DEFAULT '{}',
  scores JSONB NOT NULL DEFAULT '{}',
  context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE feedback_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type TEXT NOT NULL, -- 'hook_weight_update' | 'template_priority_update' | 'family_routing_adjustment' | 'strategy_rebalance'
  target TEXT NOT NULL,
  payload JSONB NOT NULL,
  confidence NUMERIC NOT NULL,
  sample_size INTEGER NOT NULL,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_perf_signals_asset ON performance_signals(asset_id);
CREATE INDEX idx_perf_signals_family_platform ON performance_signals(family, platform);
CREATE INDEX idx_feedback_signals_type ON feedback_signals(signal_type);
```
