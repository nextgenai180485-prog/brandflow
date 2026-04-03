# Module #26 — Decision Engine

> **Status**: Design reference  
> **Last updated**: 2026-04-03  
> **Owner**: Cross-family  
> **Depends on**: Module #25 (Research & Competitor Intelligence), Module #21 (Strategy Engine), Brand Memory Engine, Category Intelligence Cache

---

## Purpose

Convert user intent + initiative context + brand memory + market research into a **strategic creative decision** before generation. This engine is the per-request creative decisioning layer — it decides *what* to make and *why* before any family or module touches a prompt.

### Boundary with Strategy Engine (#21)

| Engine | Scope | Frequency |
|--------|-------|-----------|
| **Strategy Engine (#21)** | Campaign/system-level planning: content calendar, pillar weights, budget allocation, capacity | Weekly/campaign-level |
| **Decision Engine (#26)** | Per-request creative decisioning: which angle, which family, which hook, which tone for *this specific piece* | Per-creation-request |

The Strategy Engine produces the **campaign plan**. The Decision Engine produces the **creative strategy for each individual asset** within that plan.

---

## Inputs

```json
{
  "decision_request": {
    "user_intent": {
      "objective": "awareness | engagement | conversion | retention",
      "brief": "string — what the user wants",
      "specific_requests": ["string — any explicit user preferences"]
    },

    "initiative_context": {
      "initiative_id": "uuid",
      "campaign_track_id": "uuid | null",
      "pillar_id": "uuid | null",
      "plan_object_ref": "uuid — from Strategy Engine #21"
    },

    "brand_memory": {
      "approved_hooks": ["hook_id"],
      "rejected_hooks": ["hook_id"],
      "winning_formats": ["reel", "carousel"],
      "do_not_use_patterns": ["string"],
      "voice_preferences": "JSONB ref",
      "visual_style_preferences": "JSONB ref",
      "approval_acceptance_rate": 0.78,
      "revision_patterns": ["string — common revision reasons"]
    },

    "category_intelligence": {
      "cache_ref": "uuid — from Category Intelligence Cache",
      "confidence_score": 0.85
    },

    "intelligence_brief": {
      "brief_ref": "uuid — from Research Engine #25",
      "confidence_score": 0.82
    },

    "performance_signals": {
      "best_hook_style": "question",
      "best_platform": "instagram",
      "best_format": "reel",
      "avg_engagement_score": 72
    },

    "brand_voice_profile": {
      "tone": "string",
      "vocabulary_level": "string",
      "emoji_usage": "string",
      "cta_style": "string"
    }
  }
}
```

---

## Outputs

### Strategy Object

```json
{
  "strategy_object": {
    "strategy_id": "uuid",
    "initiative_id": "uuid",
    "brand_id": "uuid",
    "created_at": "ISO 8601",

    "angle": {
      "type": "transformation | social_proof | urgency | authority | lifestyle | education | behind_the_scenes | myth_busting",
      "rationale": "string — why this angle was chosen",
      "evidence": ["string — what data points support this choice"]
    },

    "creative_family": "F1 | F2 | F3 | F4 | F5 | F7 | F8 | F9",
    "family_rationale": "string — why this family was selected for this piece",

    "hook_type": {
      "style": "question | statistic | bold_claim | story | challenge | before_after | myth_bust",
      "selected_hook_id": "uuid | null — from Hook Library",
      "hook_text_suggestion": "string",
      "rationale": "string"
    },

    "tone_profile": {
      "primary_tone": "string",
      "secondary_tone": "string | null",
      "brand_voice_alignment_score": "number (0-100)"
    },

    "persona_alignment": {
      "target_persona": "string",
      "pain_point_addressed": "string",
      "aspiration_targeted": "string"
    },

    "platform_priority": {
      "primary": "instagram | tiktok | linkedin | youtube | facebook | twitter",
      "secondary": ["string"],
      "rationale": "string"
    },

    "cta_strategy": {
      "type": "soft | direct | urgency | social_proof",
      "cta_text_suggestion": "string",
      "placement": "end | mid_and_end | overlay"
    },

    "testing_plan": {
      "variants_recommended": "number (1-3)",
      "variant_dimensions": ["hook_style", "angle", "cta_type"],
      "rationale": "string"
    },

    "asset_selection_strategy": {
      "reuse_candidates": ["artifact_id"],
      "new_generation_required": true,
      "asset_rationale": "string"
    },

    "confidence_score": 0.85
  }
}
```

---

## Decision Logic

### Angle Selection

```
1. Load brand memory → what angles have been approved/rejected before?
2. Load category intelligence → what angles dominate in this vertical?
3. Load performance signals → what angles performed best for this brand?
4. Load competitor patterns → what angles are competitors NOT using? (opportunity gap)
5. Cross-reference with user intent → does the objective favor certain angles?
6. Score candidate angles:
   - prior_approval_weight: 0.25
   - performance_signal_weight: 0.30
   - opportunity_gap_weight: 0.20
   - intent_alignment_weight: 0.25
7. Select highest-scoring angle with confidence > 0.70
8. If no angle exceeds threshold → recommend testing plan with 2-3 angles
```

### Family Selection

```
1. Check user explicit request → if user specified family, respect it
2. Check campaign plan → does the Strategy Engine plan specify a family?
3. If neither → auto-select based on:
   - platform (TikTok → F1 UGC bias, LinkedIn → F4 Social bias)
   - objective (conversion → F7 Ad Creator bias, awareness → F5 Cinematic bias)
   - budget (draft tier → F4 Social, premium tier → F5 Cinematic)
   - brand memory (which families have highest approval rates for this brand?)
```

### Hook Selection

```
1. Query Hook Library (#11) → ranked hooks for this vertical + platform
2. Filter by brand memory → exclude rejected hooks, boost approved hooks
3. Cross-reference with competitor patterns → prefer hooks competitors aren't using
4. Apply brand voice alignment → ensure hook matches brand tone
5. Return top hook with rationale
```

---

## Integration Points

| Engine | Interaction |
|--------|------------|
| #21 Strategy Engine | Provides campaign-level plan_object context |
| #25 Research Engine | Provides internal_intelligence_brief for market context |
| #23 Creative Direction | Consumes strategy_object to build scene architecture |
| #1 Creative Director Agent | Consumes strategy_object for creative plan generation |
| #11 Hook Library | Provides ranked hook options |
| #22 Performance Feedback | Provides historical performance signals |
| Brand Memory Engine | Provides approval/rejection history, preferences |
| Category Intelligence Cache | Provides vertical/platform norms |
| Trust & Explainability Engine | Receives decision_trace for transparency |

---

## Cross-Family Adoption

| Family | Decision Engine Role |
|--------|---------------------|
| F1 UGC Video | ✅ Angle, hook, audience targeting |
| F2 AI Spokesperson | ✅ Authority positioning, script angle |
| F3 Product Videography | ✅ Product presentation angle |
| F4 Social Content | ✅ Hook, tone, platform optimization |
| F5 Cinematic Ad | ✅ Full narrative direction |
| F6 Core Elements Board | — (asset prep, no creative decision) |
| F7 Ad Creator | ✅ Ad angle, CTA strategy |
| F8 Creative Cloner | ✅ Clone direction, adaptation angle |
| F9 Image Template | ✅ Template selection, headline angle |
