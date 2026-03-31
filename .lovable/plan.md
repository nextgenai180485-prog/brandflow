

# Implement Remaining Engine Specs + Documentation Sync

## Current State

| Section | Request | Status |
|---------|---------|--------|
| 1. Review Packet Engine | Enrich schema | **Exists (#19)** — missing 10 fields from request |
| 2. Voice Engine | Enrich schema | **Exists (#20)** — missing persona matching, quality scoring, approved_for_use |
| 3. Campaign Multiplication | Enrich schema | **Exists (W6)** — missing `multiplication_plan` object |
| 4. Strategy Engine | New module spec | **Does not exist** — only product prose in BRANDFLOW_PLAN.md |
| 5. Performance Feedback Engine | New module spec | **Does not exist** |
| 6. Doc synchronization | Update registry + contracts | Needed after above |

---

## What to Build

### New Files (3)

**1. `docs/engines/STRATEGY_ENGINE.md`** — Module #21
- Convert BRANDFLOW_PLAN.md §7.1 / §9 from product prose into a technical engine contract
- Schema: `strategy_plan` with `brand_id`, `vertical_profile`, `content_pillars`, `weekly_schedule`, `campaign_tracks`, `family_distribution`, `platform_distribution`, `trend_injections`
- Responsibilities: content pillar generation, weekly post scheduling, campaign theme generation, trend signal detection, platform mix selection, family selection, initiative priority weighting
- Integration: feeds Planner Contract (family + variant selection), Hook Library (hook style weighting), Brand Voice DNA (tone alignment)

**2. `docs/engines/PERFORMANCE_FEEDBACK_ENGINE.md`** — Module #22
- Schema: `performance_signal` with `asset_id`, `initiative_id`, `platform`, `engagement_score`, `hook_score`, `conversion_signal`, `retention_signal`, `completion_rate`, `variant_rank`
- Outputs: `hook_weight_updates`, `template_priority_updates`, `family_routing_adjustments`, `strategy_rebalancing_signals`
- Integration: Hook Library weighting, Template Library scoring, Provider Routing quality tracking, Strategy Engine rebalancing

**3. `docs/PLAN_OBJECT_SCHEMA.md`**
- Unified plan object schema referenced by Strategy Engine, Planner Contract, and Review Packet
- Fields: `plan_id`, `initiative_id`, `family`, `variant_config`, `provider_route`, `fallback_route`, `risk_level`, `latency_tier`, `cost_estimate`

### Updated Files (6)

**4. `docs/engines/REVIEW_PACKET_ENGINE.md`**
- Add missing fields: `initiative_id`, `plan_id`, `revision_round`, `generation_cost_estimate`, `provider_route`, `fallback_route`, `risk_level`, `latency_tier`, `aspect_ratio_versions`, `thumbnail_set`
- Reference Plan Object Schema

**5. `docs/engines/VOICE_MANAGEMENT_ENGINE.md`**
- Add `voice_quality_scoring` pipeline details, `persona_matching` (map archetype → voice), `tone_alignment` (Brand Voice DNA integration), `approved_for_use` flag on voice_presets schema

**6. `docs/workflows/CAMPAIGN_MULTIPLICATION_WORKFLOW.md`**
- Add `multiplication_plan` schema: `source_asset_id`, `variant_count`, `hook_strategy_set`, `platform_matrix`, `testing_pack_enabled`, `localization_matrix`

**7. `docs/ENGINE_MODULE_REGISTRY.md`**
- Add Module #21 (Strategy Engine) and #22 (Performance Feedback Engine)
- Update module count to 22 + 1 workflow
- Update cross-family adoption matrix with new modules
- Add Phase G — Strategy & Learning to build order

**8. `docs/PIPELINE_CONTRACTS.md`**
- Add Strategy Engine output contract
- Add Performance Feedback signal contract
- Reference Plan Object Schema
- Update engine count

**9. `docs/pipelines/CROSS_FAMILY_ENGINE_AUDIT.md`**
- Add §21 Strategy Engine and §22 Performance Feedback Engine entries

---

## What We Are NOT Creating

The request references several docs that are aspirational cross-references rather than standalone specs:
- `PLANNER_CONTRACT.md` — covered by Plan Object Schema + Strategy Engine
- `PIPELINE_ROUTING_MATRIX.md` — covered by Provider Routing Policy
- `CONTENT_REPURPOSING_ENGINE.md` — covered by Campaign Multiplication
- `AB_VARIANT_GENERATION.md` — covered by Campaign Multiplication §5 (A/B Testing Packs)
- `PIPELINE_MULTIPLICATION_MATRIX.md` — covered by Campaign Multiplication cross-family table
- `PROMPT_ENHANCEMENT_LATEST.md` — covered by SEALCaM + Creative Director Agent

Creating these as separate files would duplicate existing specs. The content lives in the engines listed above.

---

## Final Module Count After This Work

```
Modules #1-22 + Workflow W6
  #1-18: existing (unchanged)
  #19: Review Packet Engine (enriched)
  #20: Voice Management Engine (enriched)
  #21: Strategy Engine (NEW)
  #22: Performance Feedback Engine (NEW)
  W6: Campaign Multiplication (enriched)
```

**Total**: 3 new files + 6 updated files = 9 file operations

