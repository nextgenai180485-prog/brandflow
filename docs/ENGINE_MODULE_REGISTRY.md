# Engine Module Registry — Brandflow Enterprise Engine Layer

> **Status**: Design reference — master index of all shared engine modules  
> **Last updated**: 2026-04-03  
> **Module count**: 27 modules + 1 workflow + 3 architectural layers  
> **Consolidation note**: Merged Prompt Schema Normalizer into SEALCaM (#5) and Tier Router + Provider Routing into a unified Provider & Tier Routing Engine (#9). Modules #17–#24 added in remediation phases. Modules #25–#27 and 3 architectural layers (Category Intelligence Cache, Strategy Object Builder, Brand Memory Engine, Trust & Explainability Engine) added in enterprise intelligence upgrade.

---

## Overview

The enterprise engine layer consists of 27 shared modules, 3 architectural layers, and 1 workflow that sit between family-specific orchestration logic and provider adapters. Each module is documented in its own design doc and adopted across multiple pipeline families.

---

## Module Registry

### Original Modules (from Cross-Family Engine Audit, consolidated)

| # | Module | Doc Path | Owner/Reference Family | Status |
|---|--------|----------|----------------------|--------|
| 1 | Creative Director Agent | `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` §1 | F7 Ad Creator (reference) | Designed |
| 2 | Plan Review Gate | `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` §2 | F7 Ad Creator (reference) | Designed |
| 3 | Revision Agent | `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` §3 | F7 Ad Creator (reference) | Designed |
| 4 | Asset Analyzer | `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` §7 | F8 Creative Cloner (reference) | Designed |
| 5 | SEALCaM Prompt Builder | `pipelines/SEALCAM_FRAMEWORK.md` | F8 Creative Cloner (reference) | Designed |
| 6 | Core Elements Generator | `pipelines/CORE_ELEMENTS_BOARD.md` | F6 (is the module) | Designed |
| 7 | Music Engine | `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` §8 | F5 Cinematic Ad (reference) | Designed |
| 8 | Assembly Engine | `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` §9 | F5 Cinematic Ad (reference) | Designed |
| 9 | Provider & Tier Routing Engine | `engines/PROVIDER_ROUTING_POLICY.md` | Infrastructure | Designed |
| 10 | Re-entry Controller | `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` §5 | F3 Product Videography (reference) | Designed |
| 11 | Hook Library | `pipelines/HOOK_LIBRARY_ENGINE_DESIGN.md` | Cross-family | Designed |

### New Modules (from Remediation Plan)

| # | Module | Doc Path | Owner/Reference Family | Status |
|---|--------|----------|----------------------|--------|
| 12 | Brand Voice DNA Engine | `engines/BRAND_VOICE_DNA_ENGINE.md` | Cross-family | Designed |
| 13 | Character Consistency Engine | `engines/CHARACTER_CONSISTENCY_ENGINE.md` | F1, F5, F8 | Designed |
| 14 | Template-Driven Image Composer | `engines/SOCIAL_CAROUSEL_SCHEMA.md` | F4, Image Template Engine | Designed |
| 15 | Motion Variant Selector | `engines/SPOKESPERSON_MOTION_VARIANT_ENGINE.md` | F2 AI Spokesperson | Designed |
| 16 | UGC Voiceover Extension | `engines/UGC_VOICEOVER_EXTENSION.md` | F1 UGC Video | Designed |
| 17 | Delivery & Post-Production Engine | `engines/DELIVERY_POST_PRODUCTION_ENGINE.md` | Cross-family | Designed |
| 18 | Localization & Cultural Adaptation Engine | `engines/LOCALIZATION_CULTURAL_ENGINE.md` | Cross-family | Designed |
| 19 | Review Packet Engine | `engines/REVIEW_PACKET_ENGINE.md` | Cross-family | Designed |
| 20 | Voice Management Engine | `engines/VOICE_MANAGEMENT_ENGINE.md` | Cross-family | Designed |
| 21 | Strategy Engine | `engines/STRATEGY_ENGINE.md` | Cross-family | Designed |
| 22 | Performance & Preference Feedback Engine | `engines/PERFORMANCE_FEEDBACK_ENGINE.md` | Cross-family | Designed |
| 23 | Creative Direction Engine | `engines/CREATIVE_DIRECTION_ENGINE.md` | Cross-family (mandatory Stage 1) | Designed |
| 24 | Camera Motion & Transition Engine | `engines/CAMERA_MOTION_ENGINE.md` | F1, F3, F5, F7, F8 | Designed |
| 25 | Research & Competitor Intelligence Engine | `engines/RESEARCH_COMPETITOR_INTELLIGENCE_ENGINE.md` | Cross-family | Designed |
| 26 | Decision Engine | `engines/DECISION_ENGINE.md` | Cross-family | Designed |
| 27 | Social Publishing Engine | `engines/SOCIAL_PUBLISHING_ENGINE.md` | Distribution | Designed |

### Workflows

| # | Workflow | Doc Path | Status |
|---|---------|----------|--------|
| W6 | Campaign Multiplication | `workflows/CAMPAIGN_MULTIPLICATION_WORKFLOW.md` | Designed |

### Merged Modules (no longer standalone)

| Former # | Module | Merged Into | Rationale |
|----------|--------|-------------|-----------|
| 14 (old) | Provider Routing Layer | **#9 Provider & Tier Routing Engine** | Provider fallback + quality tier = single routing decision |
| 18 (old) | Prompt Schema Normalizer | **#5 SEALCaM Prompt Builder** | F7 normalization is a SEALCaM compliance rule, not a separate engine |

### Architectural Layers (not numbered — cross-cutting)

| Layer | Doc Path | Purpose |
|-------|----------|---------|
| Category Intelligence Cache | `engines/CATEGORY_INTELLIGENCE_CACHE.md` | Cached vertical/category intelligence for cost/latency reduction |
| Strategy Object Builder | `engines/STRATEGY_OBJECT_BUILDER.md` | Transform Decision Engine output into family-specific generation instructions |
| Brand Memory Engine | `engines/BRAND_MEMORY_ENGINE.md` | Long-term brand-specific learning: approvals, preferences, do-not-use patterns |
| Trust & Explainability Engine | `engines/TRUST_EXPLAINABILITY_ENGINE.md` | Decision trace generation for transparent, evidence-backed recommendations |

### Supporting Docs

| Doc | Purpose |
|-----|---------|
| `engines/TEMPLATE_LIBRARY_OPERATIONS.md` | Template curation, scoring, retirement for F8 + Image Template Engine |
| `engines/CORE_ELEMENTS_BOARD_V2.md` | Named slots, preview overlays, partial regeneration for F6 |
| `PLAN_OBJECT_SCHEMA.md` | Unified plan object contract with versioning, budget check, capacity check, dependencies, and SLA enforcement |
| `engines/BUDGET_GOVERNANCE.md` | Per-brand spend caps, campaign allocations, burn rate tracking, tier downgrade suggestions |
| `OBSERVABILITY_CONTRACTS.md` | 3-layer observability: Event Bus, Metrics Aggregation, Audit Trail |
| `BRANDFLOW_CURRENT_ARCHITECTURE_EXPORT.md` | Complete system architecture snapshot for enterprise upgrade review |
| `db/BRANDFLOW_SQL_SCHEMA.md` | Complete database schema — 32 tables, single Supabase backend |

### Enterprise Planning Governance (cross-cutting capabilities)

| Capability | Phase | Host Module | Description |
|------------|-------|-------------|-------------|
| Budget & Spend Governance | 1A | Strategy Engine (#21) + Budget Governance doc | Pre-flight cost checks, brand spend caps, burn rate tracking |
| Configurable Approval Chains | 1B | Review Packet Engine (#19) | Role-based multi-step approval with threshold escalation and auto-approve rules |
| Plan Versioning & Diff | 1C | Plan Object Schema | Immutable version snapshots, rollback support, audit integration |
| Capacity Planning & Queue Mgmt | 2A | Strategy Engine (#21) | Provider rate limits, queue priority scoring, backpressure |
| SLA & Deadline Enforcement | 2B | Plan Object Schema + Strategy Engine (#21) | Critical path calculation, escalation triggers, compliance metrics |
| Forecasting & What-If | 2C | Strategy Engine (#21) | Dry-run simulation of cost, capacity, and SLA risk |
| Plan Templates & Playbooks | 3A | Strategy Engine (#21) | Reusable campaign blueprints by vertical |
| Dependency Tracking (DAG) | 3B | Plan Object Schema | Blocking/informing relationships between plans |
| Schedule Conflict Resolution | 3C | Strategy Engine (#21) | Platform posting limits, conflict detection and auto-resolution |
| Cross-Brand Portfolio View | 3D | Strategy Engine (#21) | Agency-tier unified dashboard, portfolio budget governance |

---

## Cross-Family Adoption Matrix

| Module | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|--------|----|----|----|----|----|----|----|----|
| 1. Creative Director Agent | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅★ | ✅ |
| 2. Plan Review Gate | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅★ | ✅ |
| 3. Revision Agent | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅★ | ✅ |
| 4. Asset Analyzer | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅★ |
| 5. SEALCaM Prompt Builder | opt | opt | ✅ | — | ✅ | — | ✅ | ✅★ |
| 6. Core Elements Generator | ✅ | ✅ | ✅ | ✅ | ✅ | ★ | ✅ | ✅ |
| 7. Music Engine | ✅ | ✅ | ✅ | — | ✅ | — | ✅ | ✅ |
| 8. Assembly Engine | ✅ | ✅ | ✅ | — | ✅ | — | ✅ | ✅ |
| 9. Provider & Tier Routing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 10. Re-entry Controller | ✅ | ✅ | ✅★ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 11. Hook Library | — | ✅ | — | ✅ | ✅ | — | ✅ | ✅ |
| 12. Brand Voice DNA | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ |
| 13. Character Consistency | ✅ | — | — | — | ✅ | — | — | ✅ |
| 14. Template Image Composer | — | — | — | ✅ | — | — | — | — |
| 15. Motion Variant Selector | — | ✅ | — | — | — | — | — | — |
| 16. UGC Voiceover | ✅ | — | — | — | — | — | — | — |
| 17. Delivery & Post-Production | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| 18. Localization & Cultural Adapt. | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| 19. Review Packet | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| 20. Voice Management | ✅ | ✅ | opt | — | ✅ | — | opt | ✅ |
| 21. Strategy Engine | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| 22. Performance Feedback | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| 23. Creative Direction | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| 24. Camera Motion & Transition | ✅ | — | ✅ | — | ✅ | — | ✅ | ✅ |

---

## Build Order

```
Phase A — Foundation (no AI calls)
  ├── 10. Re-entry Controller
  ├── 9. Provider & Tier Routing Engine
  └── 2. Plan Review Gate

Phase B — Intelligence (AI-powered)
  ├── 4. Asset Analyzer
  ├── 1. Creative Director Agent
  ├── 5. SEALCaM Prompt Builder (includes F7 normalization)
  ├── 3. Revision Agent
  ├── 11. Hook Library
  └── 12. Brand Voice DNA Engine

Phase C — Media (heavy compute)
  ├── 7. Music Engine
  ├── 8. Assembly Engine
  ├── 6. Core Elements Generator
  ├── 13. Character Consistency Engine
  ├── 14. Template Image Composer
  ├── 15. Motion Variant Selector
  └── 16. UGC Voiceover Extension

Phase D — Delivery (post-assembly)
  └── 17. Delivery & Post-Production Engine

Phase E — Localization (post-delivery)
  └── 18. Localization & Cultural Adaptation Engine

Phase F — Approval & Scaling
  ├── 19. Review Packet Engine
  ├── 20. Voice Management Engine
  └── W6. Campaign Multiplication Workflow

Phase G — Strategy & Learning
  ├── 21. Strategy Engine
  └── 22. Performance Feedback Engine

Phase H — Premium Cinematic (enterprise-grade)
  ├── 23. Creative Direction Engine (mandatory Stage 1 for all video families)
  └── 24. Camera Motion & Transition Engine
```
