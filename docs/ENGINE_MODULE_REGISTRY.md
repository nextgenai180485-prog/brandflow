# Engine Module Registry — Brandflow Enterprise Engine Layer

> **Status**: Design reference — master index of all shared engine modules  
> **Last updated**: 2026-03-31  
> **Module count**: 22 modules + 1 workflow  
> **Consolidation note**: Merged Prompt Schema Normalizer into SEALCaM (#5) and Tier Router + Provider Routing into a unified Provider & Tier Routing Engine (#9). Added Module #17 for post-production finishing, Module #18 for localization & cultural adaptation, Module #19 for review packets, Module #20 for voice management, Module #21 for strategy planning, and Module #22 for performance feedback.

---

## Overview

The enterprise engine layer consists of 22 shared modules that sit between family-specific orchestration logic and provider adapters. Each module is documented in its own design doc and adopted across multiple pipeline families.

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
| 22 | Performance Feedback Engine | `engines/PERFORMANCE_FEEDBACK_ENGINE.md` | Cross-family | Designed |

### Workflows

| # | Workflow | Doc Path | Status |
|---|---------|----------|--------|
| W6 | Campaign Multiplication | `workflows/CAMPAIGN_MULTIPLICATION_WORKFLOW.md` | Designed |

### Merged Modules (no longer standalone)

| Former # | Module | Merged Into | Rationale |
|----------|--------|-------------|-----------|
| 14 (old) | Provider Routing Layer | **#9 Provider & Tier Routing Engine** | Provider fallback + quality tier = single routing decision |
| 18 (old) | Prompt Schema Normalizer | **#5 SEALCaM Prompt Builder** | F7 normalization is a SEALCaM compliance rule, not a separate engine |

### Supporting Docs

| Doc | Purpose |
|-----|---------|
| `engines/TEMPLATE_LIBRARY_OPERATIONS.md` | Template curation, scoring, retirement for F8 + Image Template Engine |
| `engines/CORE_ELEMENTS_BOARD_V2.md` | Named slots, preview overlays, partial regeneration for F6 |
| `PLAN_OBJECT_SCHEMA.md` | Unified plan object contract consumed by Strategy Engine, Review Packets, and all orchestrators |

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

**Legend**: ✅ = adopted, ✅★ = reference pattern, opt = optional/opt-in, — = not applicable, ★ = is the module itself

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
```
