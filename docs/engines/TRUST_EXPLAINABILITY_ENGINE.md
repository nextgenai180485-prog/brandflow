# Trust & Explainability Engine

> **Status**: Design reference  
> **Last updated**: 2026-04-03  
> **Owner**: Cross-family  
> **Depends on**: Module #26 (Decision Engine), Module #25 (Research Engine), Brand Memory Engine

---

## Purpose

Make Brandflow explain why creative decisions were made. For every recommendation, review packet, or generated asset, this engine produces a structured decision trace that shows the reasoning chain from data to decision.

The system must feel intentional, evidence-backed, and business-aware. "Random asset selection" is never acceptable as reasoning.

---

## Decision Trace Schema

```json
{
  "decision_trace": {
    "trace_id": "uuid",
    "job_id": "uuid",
    "initiative_id": "uuid",
    "brand_id": "uuid",
    "created_at": "ISO 8601",

    "decision_summary": "string — one-line summary of what was decided and why",

    "signals_used": [
      {
        "signal_type": "brand_memory | category_intelligence | competitor_pattern | performance_feedback | user_intent | brand_voice | trend_signal",
        "signal_source": "string — specific module or data source",
        "signal_value": "string — what the signal said",
        "weight": "number (0-1) — how much this influenced the decision"
      }
    ],

    "rationale": {
      "angle_chosen": {
        "value": "transformation",
        "reason": "Transformation stories have 2.1x higher engagement for this brand on Instagram. Competitor @spa_luxe uses this angle successfully (78 avg engagement score). Brand memory shows 82% approval rate for this angle.",
        "confidence": 0.87
      },
      "family_chosen": {
        "value": "F1",
        "reason": "UGC-style content outperforms cinematic on TikTok for medspa vertical by 34%. Budget tier is 'standard' — F1 is the optimal cost/quality fit.",
        "confidence": 0.82
      },
      "hook_chosen": {
        "value": "before_after",
        "reason": "Before/after hooks have 1.8x CTR in medspa category. Brand has approved 8 before/after hooks vs 2 rejections.",
        "confidence": 0.79
      },
      "platform_chosen": {
        "value": "instagram",
        "reason": "Brand's Instagram has 3.2x the engagement rate of their TikTok. Category benchmark shows Instagram dominates for medspa content.",
        "confidence": 0.91
      }
    },

    "rejected_alternatives": [
      {
        "alternative": "F5 Cinematic Ad",
        "reason_rejected": "Budget tier 'standard' does not support premium cinematic. Brand memory shows low approval rate (67%) for F5 content.",
        "would_reconsider_if": "Budget upgraded to premium tier, or brand explicitly requests cinematic"
      },
      {
        "alternative": "urgency hook",
        "reason_rejected": "Brand do-not-use registry: 'urgency hooks flagged as pushy' (5 rejections). Brand voice profile prefers soft sell approach.",
        "would_reconsider_if": "Time-sensitive offer explicitly requested by user"
      }
    ],

    "assumptions": [
      "Target audience is women 25-45 based on brand profile",
      "Product is a facial treatment based on initiative context",
      "Instagram Reels format based on platform priority and engagement data"
    ],

    "confidence": {
      "overall": 0.84,
      "data_freshness": "Research brief is 2 days old (within 7-day window)",
      "sample_size": "45 prior brand interactions",
      "limiting_factor": "Limited TikTok performance data (only 3 prior posts)"
    },

    "next_test_recommendation": {
      "test_type": "A/B hook test",
      "description": "Test 'question' hook vs 'before_after' hook on this brand's next Instagram Reel to validate hook preference",
      "rationale": "Both hooks perform within 10% of each other — more data needed to establish clear winner"
    }
  }
}
```

---

## Trace Assembly Pipeline

```
Decision Engine (#26) completes strategy_object
  │
  ├─── Collect Signal Sources
  │      └─ Brand memory signals (approval history, preferences, do-not-use)
  │      └─ Research signals (competitor patterns, category norms)
  │      └─ Performance signals (engagement scores, hook win rates)
  │      └─ User intent signals (explicit preferences, brief content)
  │      └─ Brand voice signals (tone alignment scoring)
  │
  ├─── Build Rationale Chain
  │      └─ For each decision (angle, family, hook, platform, CTA):
  │         └─ Link to supporting signals with weights
  │         └─ Calculate confidence per decision
  │         └─ Identify strongest evidence and weakest assumption
  │
  ├─── Document Rejected Alternatives
  │      └─ For each considered-but-rejected option:
  │         └─ State what it was
  │         └─ State why it was rejected (with evidence)
  │         └─ State what would change the decision
  │
  ├─── State Assumptions
  │      └─ List every inference made from incomplete data
  │      └─ Flag assumptions with lowest confidence
  │
  └─── Generate Test Recommendation
         └─ Identify the decision with lowest confidence
         └─ Suggest a concrete test to resolve ambiguity
         └─ Frame as actionable next step for the user
```

---

## Integration Points

| Engine | Interaction |
|--------|------------|
| #26 Decision Engine | Primary source — produces the decisions being traced |
| #25 Research Engine | Provides intelligence signals used in rationale |
| #19 Review Packet Engine | Decision trace is embedded in every review packet |
| #2 Plan Review Gate | Displays decision rationale to user during approval |
| Brand Memory Engine | Provides historical evidence for decisions |
| #22 Performance Feedback | Provides performance-based evidence |

---

## Review Packet Integration

Every review packet now includes an `explainability` section:

```json
{
  "review_packet": {
    "...existing fields...",

    "explainability": {
      "decision_trace_id": "uuid",
      "strategy_angle": "transformation",
      "why_chosen": "string — one-paragraph explanation",
      "competitor_context_summary": "string — key competitive insights",
      "confidence_score": 0.84,
      "assumptions": ["string"],
      "alternatives_considered": [
        { "alternative": "string", "why_not": "string" }
      ],
      "recommended_next_test": "string"
    }
  }
}
```

---

## Rendering Rules

| Context | What to Show | Detail Level |
|---------|-------------|-------------|
| Plan Review Gate (pre-generation) | Strategy angle, hook rationale, confidence | Summary |
| Review Packet (post-generation) | Full decision trace with alternatives | Full |
| Quick approval (auto-approve eligible) | One-line rationale + confidence | Minimal |
| Admin/agency dashboard | Full trace with signal weights | Full + debug |

---

## Database Schema

```sql
CREATE TABLE decision_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  initiative_id UUID,
  brand_id UUID NOT NULL,
  strategy_object_id UUID,
  decision_summary TEXT NOT NULL,
  signals_used JSONB NOT NULL DEFAULT '[]',
  rationale JSONB NOT NULL DEFAULT '{}',
  rejected_alternatives JSONB NOT NULL DEFAULT '[]',
  assumptions JSONB NOT NULL DEFAULT '[]',
  confidence JSONB NOT NULL DEFAULT '{}',
  next_test_recommendation JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_decision_traces_job ON decision_traces(job_id);
CREATE INDEX idx_decision_traces_brand ON decision_traces(brand_id);
```
