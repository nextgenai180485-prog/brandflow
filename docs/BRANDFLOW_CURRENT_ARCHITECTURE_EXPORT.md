# Brandflow Current Architecture Export

> **Status**: Enterprise-upgraded — implementation-ready reference  
> **Last updated**: 2026-04-03  
> **Purpose**: Complete system architecture — post-enterprise intelligence upgrade  
> **Module count**: 27 engines + 4 architectural layers + 1 workflow (W6)  
> **Family count**: 9 generation families (F1–F9)  
> **Schema count**: 32 tables formalized in `docs/db/BRANDFLOW_SQL_SCHEMA.md`

---

## SECTION A — Top-Level Architecture Summary

### Product Thesis

Brandflow is an **AI-powered social media operating system** that transforms business intent into production-ready creative assets across 9 generation families. The architecture is built on three pillars:

1. **Approval-first delivery** — Nothing reaches production without human review via structured Review Packets
2. **Enterprise-grade orchestration** — 24 shared engine modules provide consistent quality, cost governance, and compliance across all families
3. **Closed-loop learning** — Performance signals feed back into hook selection, provider routing, and strategy planning

### Architecture Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 9: USER INTERFACE                                             │
│  React 18 + Vite 5 + Tailwind CSS + shadcn/ui                       │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 8: STRATEGY & PLANNING                                        │
│  Strategy Engine (#21), Creative Direction (#23), Budget Governance   │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 7: RESEARCH & MARKET INTELLIGENCE  ★ NEW                      │
│  Research & Competitor Intelligence (#25), Category Intelligence     │
│  Cache, Brand Memory Engine                                          │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 6: DECISION & TRUST  ★ NEW                                    │
│  Decision Engine (#26), Strategy Object Builder,                     │
│  Trust & Explainability Engine                                       │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 5: INTELLIGENCE & REASONING                                    │
│  Creative Director Agent (#1), Asset Analyzer (#4), SEALCaM (#5),    │
│  Brand Voice DNA (#12), Hook Library (#11), Revision Agent (#3)      │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 4: MEDIA GENERATION                                            │
│  Provider Routing (#9), Camera Motion (#24), Character Consistency   │
│  (#13), Music (#7), Voice Management (#20), Assembly (#8)            │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 3: POST-PRODUCTION & DELIVERY                                  │
│  Post-Production (#17), Review Packet (#19), Localization (#18),     │
│  Campaign Multiplication (W6), Social Publishing (#27), Delivery     │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 2: APPROVAL & TRUST                                            │
│  Plan Review Gate (#2), Review Packets, Audit Trail (Layer 3 obs.)   │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 1: OBSERVABILITY                                               │
│  Touchpoint Events (L0), Event Bus (L1), Metrics Aggregation (L2),   │
│  Audit Trail (L3) — see OBSERVABILITY_CONTRACTS.md                   │
├──────────────────────────────────────────────────────────────────────┤
│  LAYER 0: INFRASTRUCTURE                                              │
│  Supabase (DB, Auth, Storage, Edge Functions, Task Queue),           │
│  Re-entry Controller (#10), Performance & Preference Feedback (#22)  │
└──────────────────────────────────────────────────────────────────────┘
```

### Orchestration Model

**Hybrid**: Supabase Edge Functions handle execution planning and lighter tasks (text, images, voice). Python workers manage heavy compute (video generation, FFmpeg composition). Communication via Supabase task queue with state machine tracking job stages from `pending` to `completed`.

### 9 Generation Families

| ID | Name | Primary Output |
|----|------|---------------|
| F1 | UGC Video Pipeline | Short-form video ads (5–15s) |
| F2 | AI Spokesperson | Lip-synced talking-head video |
| F3 | Product Videography | Product showcase video |
| F4 | Social Content Batch | 7-platform text + images |
| F5 | Cinematic Ad | Multi-scene cinematic video |
| F6 | Core Elements Board | Composite brand board (PNG) |
| F7 | Ad Creator | Polished product ad (video + image + caption) |
| F8 | Creative Cloner | Recreated video from source reference |
| F9 | Image Template Engine | Template-driven image creation |

### 6 Core Enterprise Workflows

1. **Creative Generation** — Intake to first review
2. **Creative Finishing** — Polishing, subtitles, thumbnails
3. **Localization** — Multilingual market-ready versions
4. **Approval** — Review packets and audit trails
5. **Delivery** — Export packaging and deliverables
6. **Campaign Multiplication** — Variants, cutdowns, A/B packs

---

## SECTION B — Engine/Module Registry

### Foundation Layer

#### Module #9 — Provider & Tier Routing Engine
| Field | Value |
|-------|-------|
| **Purpose** | Route generation requests to optimal provider/model based on tier, capability, cost, and health |
| **Category** | Infrastructure / Routing |
| **Doc** | `engines/PROVIDER_ROUTING_POLICY.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Family, tier (draft/standard/premium), required capabilities (camera motion, voice, lipsync), budget constraints |
| **Outputs** | `provider_id`, `model_id`, `fallback_provider_id`, estimated cost |
| **Dependencies** | None (foundational) |
| **Pipeline Position** | Pre-generation — resolves provider before any API call |
| **Key Detail** | 3-strike health check (60s polling), automated failover, camera capability matrix per provider |

#### Module #10 — Re-entry Controller
| Field | Value |
|-------|-------|
| **Purpose** | Resume interrupted jobs from last successful stage; manage dependency-blocked plans |
| **Category** | Infrastructure / State Management |
| **Doc** | `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` §5 |
| **Status** | Designed — not yet implemented |
| **Inputs** | `job_id`, current state, dependency graph |
| **Outputs** | Resume point, restored context, dependency satisfaction check |
| **Dependencies** | Plan Object Schema (for dependency DAG) |
| **Pipeline Position** | Cross-cutting — invoked on any job restart or dependency resolution |

#### Module #2 — Plan Review Gate
| Field | Value |
|-------|-------|
| **Purpose** | Human approval checkpoint before generation and before delivery |
| **Category** | Approval / Trust |
| **Doc** | `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` §2 |
| **Status** | Designed — not yet implemented |
| **Inputs** | Plan object, creative brief, cost estimate, risk assessment, budget check |
| **Outputs** | `approved` / `rejected` / `revision_requested` decision |
| **Dependencies** | Creative Director Agent (#1) output, Plan Object Schema |
| **Pipeline Position** | Two checkpoints: (1) after planning, before generation; (2) after post-production, before delivery |

### Intelligence Layer

#### Module #1 — Creative Director Agent
| Field | Value |
|-------|-------|
| **Purpose** | AGENT framework reasoning — generates creative plans from business intent and brand context |
| **Category** | Intelligence / Planning |
| **Doc** | `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` §1 |
| **Status** | Designed — not yet implemented |
| **Inputs** | User brief, brand voice profile, asset analysis results, hook options, creative direction output |
| **Outputs** | Creative plan with scene descriptions, prompt strategy, generation parameters |
| **Dependencies** | Asset Analyzer (#4), Brand Voice DNA (#12), Hook Library (#11), Creative Direction (#23) |
| **Pipeline Position** | Pre-generation — after Creative Direction, before Plan Review Gate |

#### Module #4 — Asset Analyzer
| Field | Value |
|-------|-------|
| **Purpose** | Vision model scoring and classification of reference images and uploaded assets |
| **Category** | Intelligence / Analysis |
| **Doc** | `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` §7 |
| **Status** | Designed — not yet implemented |
| **Inputs** | Image URLs, video URLs |
| **Outputs** | Quality scores, subject classification, composition analysis, usability flags |
| **Dependencies** | Provider Routing (#9) for vision model selection |
| **Pipeline Position** | Early pre-generation — after intake, before planning |

#### Module #5 — SEALCaM Prompt Builder
| Field | Value |
|-------|-------|
| **Purpose** | Structured prompt construction using Setting, Elements, Action, Lighting, Camera, Motion schema |
| **Category** | Intelligence / Prompting |
| **Doc** | `pipelines/SEALCAM_FRAMEWORK.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Scene description, camera motion object, character descriptors, brand elements |
| **Outputs** | Provider-specific prompt text, structured `SEALCaMScene` object with `CameraMotion`, `SceneTransition`, `Interpolation` types |
| **Dependencies** | Camera Motion (#24) for structured camera params, Character Consistency (#13) for descriptors |
| **Pipeline Position** | Pre-generation — converts creative plan to provider-ready prompts |
| **Key Detail** | Includes F7 normalization (formerly separate module). Provider translation layer maps structured camera to Veo3/Kling/Runway syntax |

#### Module #3 — Revision Agent
| Field | Value |
|-------|-------|
| **Purpose** | Feedback-aware re-prompting — takes rejection reasons and adjusts generation parameters |
| **Category** | Intelligence / Iteration |
| **Doc** | `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` §3 |
| **Status** | Designed — not yet implemented |
| **Inputs** | Original plan, rejection reason, reviewer feedback |
| **Outputs** | Revised plan with targeted changes |
| **Dependencies** | Plan Review Gate (#2) rejection output |
| **Pipeline Position** | Revision loop — invoked when Plan Review Gate returns `revision_requested` |

#### Module #11 — Hook Library
| Field | Value |
|-------|-------|
| **Purpose** | Performance-ranked hook patterns for content openings (question, social proof, urgency, etc.) |
| **Category** | Intelligence / Content Strategy |
| **Doc** | `pipelines/HOOK_LIBRARY_ENGINE_DESIGN.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Industry, platform, content format, brand voice profile |
| **Outputs** | Ranked hook options with performance scores, hook text, hook style classification |
| **Dependencies** | Performance Feedback (#22) for weight updates, Firecrawl for seeding |
| **Pipeline Position** | Pre-generation — queried during Creative Direction and Creative Director Agent planning |

#### Module #12 — Brand Voice DNA Engine
| Field | Value |
|-------|-------|
| **Purpose** | Extract and enforce brand-specific voice, tone, vocabulary across all generation |
| **Category** | Intelligence / Brand Identity |
| **Doc** | `engines/BRAND_VOICE_DNA_ENGINE.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Brand website URL, existing content samples, social profiles |
| **Outputs** | `brand_voice_profile` JSONB (tone, vocabulary, sentence patterns, emoji usage, formatting habits) |
| **Dependencies** | Firecrawl (web scraping), Gemini (analysis) |
| **Pipeline Position** | Onboarding (one-time extraction) + injected into every generation prompt |

### Media Layer

#### Module #7 — Music Engine
| Field | Value |
|-------|-------|
| **Purpose** | Generate or select background music matching video mood and duration |
| **Category** | Media / Audio |
| **Doc** | `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` §8 |
| **Status** | Designed — not yet implemented |
| **Inputs** | Mood, duration, genre preferences, video emotional arc |
| **Outputs** | Music audio file URL, BPM, key, duration |
| **Dependencies** | Provider Routing (#9) for Suno/Udio selection |
| **Pipeline Position** | Parallel with video generation — merged during assembly |

#### Module #8 — Assembly Engine
| Field | Value |
|-------|-------|
| **Purpose** | FFmpeg-based video composition — stitches scenes, applies transitions, mixes audio |
| **Category** | Media / Composition |
| **Doc** | `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` §9 |
| **Status** | Designed — not yet implemented |
| **Inputs** | Video clips, music audio, voiceover audio, scene transition specs, camera motion metadata |
| **Outputs** | Assembled video file (MP4) |
| **Dependencies** | Camera Motion (#24) for transition types, Music Engine (#7) output, Voice Management (#20) output |
| **Pipeline Position** | Post-generation — after all scenes and audio are ready |

#### Module #6 — Core Elements Generator
| Field | Value |
|-------|-------|
| **Purpose** | Generate composite brand board with character, setting, and product elements |
| **Category** | Media / Asset Preparation |
| **Doc** | `pipelines/CORE_ELEMENTS_BOARD.md`, `engines/CORE_ELEMENTS_BOARD_V2.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Wireframe template, character photo, setting photo, product photo |
| **Outputs** | Composite brand board image (9:16 PNG), named slots with metadata |
| **Dependencies** | Asset Analyzer (#4) for input quality validation |
| **Pipeline Position** | Pre-generation — provides visual reference for downstream families |

#### Module #13 — Character Consistency Engine
| Field | Value |
|-------|-------|
| **Purpose** | Maintain character appearance consistency across multi-scene videos |
| **Category** | Media / Quality Assurance |
| **Doc** | `engines/CHARACTER_CONSISTENCY_ENGINE.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Canonical character descriptors, reference images, generated scene frames |
| **Outputs** | Consistency scores, pass/fail per scene, strengthened descriptors for retry |
| **Dependencies** | SEALCaM (#5) for descriptor format, Provider Routing (#9) for provider-native identity features |
| **Pipeline Position** | Post-generation validation — runs after each scene; gates next scene |
| **Key Detail** | Current design achieves ~85% consistency via text descriptors + end-frame passthrough. Hardening spec targets ~95% with structured appearance locking, scene-chain validation (threshold 0.85), end-frame quality gate, and provider-specific identity hints |

#### Module #14 — Template-Driven Image Composer
| Field | Value |
|-------|-------|
| **Purpose** | SeedEdit-powered template recreation with slot-based asset/text/color swapping |
| **Category** | Media / Image Generation |
| **Doc** | `engines/SOCIAL_CAROUSEL_SCHEMA.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Template ID, slot values (text, images, colors), brand profile |
| **Outputs** | Composed image per template slot configuration |
| **Dependencies** | Template Library (for template selection), Brand Voice DNA (#12) for headline generation |
| **Pipeline Position** | Generation — F4 and F9 families |

#### Module #15 — Motion Variant Selector
| Field | Value |
|-------|-------|
| **Purpose** | Mitigate F2 spokesperson stiffness by generating 3 Kling variants and scoring for naturalness |
| **Category** | Media / Quality Selection |
| **Doc** | `engines/SPOKESPERSON_MOTION_VARIANT_ENGINE.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Base video generation params, character reference |
| **Outputs** | Selected best variant with naturalness score, motion quality metrics |
| **Dependencies** | Provider Routing (#9) for Kling 2.6 |
| **Pipeline Position** | Generation — F2 specific, runs 3 parallel generations then selects |

#### Module #16 — UGC Voiceover Extension
| Field | Value |
|-------|-------|
| **Purpose** | Add natural voiceover to UGC-style videos with optional lip-sync |
| **Category** | Media / Audio |
| **Doc** | `engines/UGC_VOICEOVER_EXTENSION.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Script text, voice preset, video file, lip-sync flag |
| **Outputs** | Video with voiceover (and optional lip-sync) |
| **Dependencies** | Voice Management (#20) for TTS, Fal.ai for lip-sync |
| **Pipeline Position** | Post-generation — F1 specific, after base video generation |

### Delivery Layer

#### Module #17 — Delivery & Post-Production Engine
| Field | Value |
|-------|-------|
| **Purpose** | Finishing pipeline: subtitles, watermark, audio polish, enhancement, thumbnails, multi-format export |
| **Category** | Delivery / Finishing |
| **Doc** | `engines/DELIVERY_POST_PRODUCTION_ENGINE.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Assembled video, brand profile (watermark, colors), export specs |
| **Outputs** | Review copy (720p, watermarked, stream-only) + production exports (multi-platform, multi-format) |
| **Dependencies** | Assembly Engine (#8) output, BytePlus VOD for processing |
| **Pipeline Position** | Post-assembly — runs 5-7 sub-operations as single billing unit |
| **Key Detail** | Review-safe delivery: review copy is watermarked/stream-only; production files locked until approval. Voice stem normalization at -16 LUFS (by #20), final mix normalization at -14 LUFS (by #17) |

### Localization Layer

#### Module #18 — Localization & Cultural Adaptation Engine
| Field | Value |
|-------|-------|
| **Purpose** | Multilingual translation, cultural adaptation, dubbing coordination |
| **Category** | Localization |
| **Doc** | `engines/LOCALIZATION_CULTURAL_ENGINE.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Approved content, target BCP-47 language codes, cultural sensitivity flags |
| **Outputs** | Localized versions with translated text, dubbed audio, adapted visuals |
| **Dependencies** | Voice Management (#20) for dubbing, Post-Production (#17) for integration |
| **Pipeline Position** | Post-approval — optional, per target market |

### Approval & Scaling Layer

#### Module #19 — Review Packet Engine
| Field | Value |
|-------|-------|
| **Purpose** | Generate structured approval artifacts with plan context, cost summary, and risk flags |
| **Category** | Approval |
| **Doc** | `engines/REVIEW_PACKET_ENGINE.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Plan object, generated artifacts, cost data, risk assessment |
| **Outputs** | Review packet object with approval/rejection interface, configurable approval chains |
| **Dependencies** | Plan Object Schema, Post-Production (#17) for review copy |
| **Pipeline Position** | Post-production — creates approval artifact for human review |
| **Key Detail** | Supports role-based multi-step approval with threshold escalation and auto-approve rules |

#### Module #20 — Voice Management Engine
| Field | Value |
|-------|-------|
| **Purpose** | Unified voice abstraction — TTS, voice cloning, dubbing via single interface |
| **Category** | Media / Voice |
| **Doc** | `engines/VOICE_MANAGEMENT_ENGINE.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Script text, voice mode (TTS/clone/upload), language, voice preset ID |
| **Outputs** | Audio file URL, duration, voice quality score |
| **Dependencies** | Provider Routing (#9) for ElevenLabs/BytePlus selection |
| **Pipeline Position** | Generation — parallel with video generation; consumed by Assembly (#8) and Post-Production (#17) |
| **Key Detail** | Sole owner of all voice/TTS operations. UGC Voiceover (#16), Motion Variant (#15), and Localization (#18) route through this engine — they do NOT call voice providers directly |

### Strategy & Learning Layer

#### Module #21 — Strategy Engine
| Field | Value |
|-------|-------|
| **Purpose** | Transform business intent into executable plan objects with scheduling, budgeting, and capacity planning |
| **Category** | Strategy / Planning |
| **Doc** | `engines/STRATEGY_ENGINE.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Brand profile, campaign objectives, budget constraints, content calendar, trend signals |
| **Outputs** | Plan objects (ref: PLAN_OBJECT_SCHEMA.md), weekly schedule, campaign tracks, trend injections |
| **Dependencies** | Budget Governance doc, Performance Feedback (#22) for optimization signals |
| **Pipeline Position** | Entry point — first module invoked; produces plan objects consumed by all downstream |
| **Key Detail** | Enterprise planning governance: budget & spend caps, configurable approval chains, plan versioning & diff, capacity planning & queue management, SLA & deadline enforcement, forecasting & what-if, plan templates & playbooks, dependency tracking (DAG), schedule conflict resolution, cross-brand portfolio view |

#### Module #22 — Performance Feedback Engine
| Field | Value |
|-------|-------|
| **Purpose** | Closed-loop learning — ingest performance signals, update hook weights, template priorities, provider routing |
| **Category** | Learning / Optimization |
| **Doc** | `engines/PERFORMANCE_FEEDBACK_ENGINE.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Post-publish engagement metrics (T+24h, T+48h, T+7d, T+30d), platform analytics |
| **Outputs** | Hook weight updates → Hook Library (#11), template priority updates → Template Library, family routing adjustments → Provider Routing (#9), strategy rebalancing signals → Strategy Engine (#21) |
| **Dependencies** | Social platform APIs (planned), plan objects for correlation |
| **Pipeline Position** | Post-delivery — asynchronous signal collection and weight updates |

### Premium Cinematic Layer

#### Module #23 — Creative Direction Engine
| Field | Value |
|-------|-------|
| **Purpose** | Mandatory Stage 0 — transforms business inputs into strategic creative brief before any generation |
| **Category** | Strategy / Creative Intelligence |
| **Doc** | `engines/CREATIVE_DIRECTION_ENGINE.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Brand, product/service, offer, audience, platform(s), duration, tone, compliance constraints, reference assets, visual style |
| **Outputs** | `ad_angle` (strategic positioning), `hook_logic` (from Hook Library with ranking), `scene_architecture[]` (ordered scenes with purpose, timing, camera presets), `offer_emphasis` (overlay timing, verbal mention, visual callout), `emotional_arc` (tension curve mapped to scenes) |
| **Dependencies** | Hook Library (#11), Brand Voice DNA (#12), Asset Analyzer (#4) |
| **Pipeline Position** | Stage 0 — mandatory first step for all video families (F1–F5, F7, F8) |
| **Key Detail** | Per-family adaptations: F1 (authenticity bias, testimonial angles), F2 (script-first, authority angles), F3 (product hero shots, feature arcs), F5 (multi-scene narrative, dramatic camera). This is identified as the **biggest commercial gap** — spec exists but no reasoning logic is built |

#### Module #24 — Camera Motion & Transition Engine
| Field | Value |
|-------|-------|
| **Purpose** | Structured camera vocabulary replacing freeform text prompts; scene transition and interpolation control |
| **Category** | Media / Cinematic Control |
| **Doc** | `engines/CAMERA_MOTION_ENGINE.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Creative Direction output (scene architecture with camera presets) |
| **Outputs** | `CameraMotion` object (17 move types, intensity 0.0–1.0, speed curve, focus pull), `SceneTransition` object (10 transition types, duration, direction), `Interpolation` object (style, easing, mid-keyframe hint) |
| **Dependencies** | Creative Direction (#23) for scene presets, Provider Routing (#9) for camera capability matrix |
| **Pipeline Position** | Pre-generation — feeds structured params into SEALCaM (#5) and Assembly (#8) |
| **Key Detail** | Provider translation layer maps structured params to: Veo3 (natural language with intensity keywords), Kling 2.6 (motion control parameters), Runway Gen-4 (camera motion presets + intensity) |

### Workflows

#### W6 — Campaign Multiplication Workflow
| Field | Value |
|-------|-------|
| **Purpose** | Generate variants (hook swaps, cutdowns, aspect ratio changes, A/B packs) from approved content |
| **Doc** | `workflows/CAMPAIGN_MULTIPLICATION_WORKFLOW.md` |
| **Status** | Designed — not yet implemented |
| **Inputs** | Approved content, variant config (from plan object) |
| **Outputs** | Variant pack: hook variants, duration cutdowns, aspect ratio variants, localized versions |
| **Dependencies** | Hook Library (#11), Localization (#18), Post-Production (#17) |
| **Pipeline Position** | Post-approval — after content is approved, before final delivery |

---

## SECTION C — Workflow/Family Registry

### F1 — UGC Video Pipeline
| Field | Value |
|-------|-------|
| **Purpose** | Generate authentic UGC-style video ads (5–15s) |
| **Engine Modules** | #23, #4, #1, #2, #3, #6, #7 (opt), #8, #10, #9, #16 (opt), #13, #12, #24 (opt) |
| **Doc** | `pipelines/UGC_VIDEO_PIPELINE.md` |
| **State** | Designed — not yet implemented |
| **Gaps** | No voiceover lip-sync integration tested; character consistency at ~85% |

### F2 — AI Spokesperson (Lip-Sync Talking Head)
| Field | Value |
|-------|-------|
| **Purpose** | Generate lip-synced talking-head videos from script + photo |
| **Engine Modules** | #23, #4, #1, #2, #3, #11, #7 (opt), #8, #10, #9, #15, #12 |
| **Doc** | `pipelines/AI_SPOKESPERSON_PIPELINE.md` |
| **State** | Designed — not yet implemented |
| **Gaps** | Motion stiffness mitigation relies on generating 3 variants (3x cost); no provider-native identity embedding |

### F3 — Product Videography
| Field | Value |
|-------|-------|
| **Purpose** | Generate product showcase videos with hero shots |
| **Engine Modules** | #23, #4, #1, #2, #3, #5, #6, #7 (opt), #8, #10, #9, #24 |
| **Doc** | `pipelines/PRODUCT_VIDEOGRAPHY_PIPELINE.md` |
| **State** | Designed — not yet implemented |
| **Gaps** | Camera motion still text-hint dependent on provider interpretation |

### F4 — Social Content Batch
| Field | Value |
|-------|-------|
| **Purpose** | Generate platform-optimized text posts + images for 7 platforms |
| **Engine Modules** | #23, #1, #2, #3, #11, #6, #10, #14, #12, #9 |
| **Doc** | `pipelines/SOCIAL_CONTENT_PIPELINE.md` |
| **State** | Designed — not yet implemented |
| **Gaps** | No social publishing integration (delivery stops at export) |

### F5 — Cinematic Ad
| Field | Value |
|-------|-------|
| **Purpose** | Generate full cinematic ads with synced video, music, and voiceover |
| **Engine Modules** | #23, #4, #1, #2, #3, #5, #6, #11, #7, #8, #10, #9, #13, #12, #24 |
| **Doc** | `pipelines/CINEMATIC_AD_PIPELINE.md` |
| **State** | Designed — not yet implemented |
| **Gaps** | Scene-to-scene coherence ~85%; camera motion and interpolation depend on provider text interpretation; Creative Direction reasoning not built |

### F6 — Core Elements Board
| Field | Value |
|-------|-------|
| **Purpose** | Generate composite brand board with character, setting, product slots |
| **Engine Modules** | #4 (opt), #10, #9 |
| **Doc** | `pipelines/CORE_ELEMENTS_BOARD.md`, `engines/CORE_ELEMENTS_BOARD_V2.md` |
| **State** | Designed — not yet implemented |
| **Gaps** | V2 spec (named slots, preview overlays, partial regeneration) not integrated into V1 pipeline contract |

### F7 — Ad Creator
| Field | Value |
|-------|-------|
| **Purpose** | Generate polished product ads (video + image + caption) |
| **Engine Modules** | #23, #4, #1, #2, #3, #5, #6, #11, #7 (opt), #8, #10, #9, #12, #24 |
| **Doc** | `pipelines/AD_CREATOR_PIPELINE.md` |
| **State** | Designed — not yet implemented |
| **Gaps** | F7 normalization merged into SEALCaM — verify integration path |

### F8 — Creative Cloner
| Field | Value |
|-------|-------|
| **Purpose** | Recreate videos preserving original cinematic structure from source reference |
| **Engine Modules** | #23, #4, #1, #2, #3, #5, #6, #11, #7, #8, #10, #9, #13, #12, #24 |
| **Doc** | `pipelines/CREATIVE_CLONER_PIPELINE.md` |
| **State** | Designed — not yet implemented |
| **Gaps** | Source video analysis accuracy depends on vision model quality; character consistency across cloned scenes |

### F9 — Image Template Engine
| Field | Value |
|-------|-------|
| **Purpose** | Template-driven image creation with slot-based customization |
| **Engine Modules** | #14, #12, #9 |
| **Doc** | `docs/ux/IMAGE_TEMPLATE_UX_FLOW.md`, `pipelines/IMAGE_TEMPLATE_ENGINE_DESIGN.md` |
| **State** | Designed — not yet implemented |
| **Gaps** | **Not listed in PIPELINE_CONTRACTS.md family contracts**; no formal engine module list defined; missing from family contract registry |

### W6 — Campaign Multiplication Workflow
| Field | Value |
|-------|-------|
| **Purpose** | Generate variants, cutdowns, hook swaps, and A/B packs from approved content |
| **Engine Modules** | #11, #18, #17, #8 |
| **Doc** | `workflows/CAMPAIGN_MULTIPLICATION_WORKFLOW.md` |
| **State** | Designed — not yet implemented |
| **Gaps** | No A/B test result ingestion — generates variants but no closed-loop measurement |

---

## SECTION D — Pre-Generation Pipeline Order

The exact ordered flow from user intent to generation trigger:

```
Step 1:  User Intent Capture
         └─ User submits brief (brand, product, offer, audience, platform, duration, tone, assets)
         └─ System loads brand profile (colors, fonts, voice_profile, assets)
         └─ System loads initiative context (campaign track, content pillar)

Step 2:  Strategy Engine (#21) → Plan Object Creation
         └─ Translates intent into plan_object (ref: PLAN_OBJECT_SCHEMA.md)
         └─ Sets routing: family, platform, format, aspect_ratio
         └─ Sets generation_config: tier, provider_route, voice_config, music_config
         └─ Sets variant_config: hook_variants, aspect_ratio_variants, localization_targets

Step 3:  Budget Governance Pre-Flight Check
         └─ Validates plan cost_estimate against brand spend caps
         └─ Checks burn_rate_daily_usd and projected_exhaustion_date
         └─ If blocked → status: blocked_budget (plan paused until budget increased)

Step 4:  Capacity Check / Queue Management
         └─ Validates provider availability via Provider Routing (#9) health checks
         └─ Assigns queue_position and estimated_start
         └─ If backpressure → queue with priority scoring

Step 5:  Stage 0 — Creative Direction (#23) [MANDATORY for F1-F5, F7, F8]
         └─ Intake: brand, product, offer, audience, platform, duration, tone, constraints, assets, style
         └─ Reasoning: ad_angle selection, hook_logic from Hook Library (#11)
         └─ Output: scene_architecture[] with purpose (hook/build/offer/CTA), timing, camera_motion presets
         └─ Output: offer_emphasis (overlay timing, verbal mention, visual callout)
         └─ Output: emotional_arc (intrigue → desire → urgency → action)
         └─ Family-specific adaptation applied (F1=authenticity, F2=script-first, F3=product-hero, F5=narrative)

Step 6:  Asset Analysis (#4)
         └─ Vision model scoring of all reference images and uploaded assets
         └─ Quality scores, subject classification, composition analysis
         └─ Usability flags (resolution, cropping suggestions)

Step 7:  Brand Voice DNA Injection (#12)
         └─ Load brand_voice_profile from brand_profiles.voice_profile JSONB
         └─ Inject tone, vocabulary, sentence patterns, emoji usage into generation prompts

Step 8:  Hook Library Query (#11)
         └─ Query ranked hooks by industry, platform, content format
         └─ Apply brand voice weighting
         └─ Return top-N hook options with performance scores

Step 9:  SEALCaM Prompt Construction (#5)
         └─ Convert creative direction + scene architecture into structured SEALCaM scenes
         └─ Map camera_motion objects to provider-specific prompt syntax via translation layer
         └─ Include character descriptors from Character Consistency (#13)

Step 10: Creative Director Agent (#1)
         └─ AGENT framework reasoning over all upstream outputs
         └─ Generate final creative plan with scene descriptions, prompt strategy, generation params
         └─ Integrate hook selection, camera presets, brand voice constraints

Step 11: Plan Review Gate (#2) — Checkpoint 1
         └─ Present plan to user: creative direction, cost estimate, risk assessment, budget check
         └─ User decision: approve / reject / request revision

Step 12: [Revision Loop via #3 if rejected]
         └─ Revision Agent takes rejection reason + reviewer feedback
         └─ Adjusts plan parameters, re-runs relevant upstream steps
         └─ Returns to Plan Review Gate

Step 13: Provider & Tier Routing (#9)
         └─ Resolve final provider + model based on plan tier, required capabilities, health
         └─ Set fallback_provider for automated failover
         └─ Camera capability matrix check (does selected provider support required camera_motion?)

Step 14: Generation Trigger
         └─ All pre-generation steps complete
         └─ Job status: generating
         └─ Provider API calls begin
```

---

## SECTION E — Post-Generation Pipeline Order

```
Step 1:  Scene Generation (per scene)
         └─ Provider API call with SEALCaM prompt + camera_motion params
         └─ Receive generated video clip / image
         └─ Store as artifact in Supabase Storage

Step 2:  Character Consistency Validation (#13) [per scene, multi-scene families]
         └─ Score generated scene against canonical character descriptors
         └─ If score < 0.85 threshold → auto-regenerate with strengthened descriptors
         └─ End-frame quality gate: validate end-frame matches canonical before next scene
         └─ Pass end-frame to next scene as start-frame reference

Step 3:  Assembly Engine (#8)
         └─ FFmpeg stitching: sequence scenes per scene_architecture order
         └─ Apply scene_transition types (CUT, DISSOLVE, MATCH_CUT, WHIP_PAN, etc.)
         └─ Mix audio: voiceover + music + ambient
         └─ Apply interpolation settings (style, easing, mid-keyframe hints)

Step 4:  Post-Production (#17)
         └─ Subtitles: auto-generate via Whisper, burn into video
         └─ Watermark: apply brand watermark for review copy
         └─ Audio polish: normalize final mix to -14 LUFS
         └─ Enhancement: BytePlus VOD upscaling/color grading
         └─ Thumbnails: extract key frames, generate branded thumbnails
         └─ Export: multi-format rendering (per platform specs)
         └─ All sub-operations logged as ONE job_stages entry

Step 5:  Review Packet Generation (#19)
         └─ Create structured approval artifact
         └─ Attach: review copy (720p, watermarked, stream-only), plan context, cost summary, risk flags
         └─ Configurable approval chain: role-based, threshold escalation, auto-approve rules

Step 6:  Plan Review Gate (#2) — Checkpoint 2
         └─ Present review packet to reviewer(s)
         └─ Decision: approve / reject / revision_requested

Step 7:  [Revision Loop if rejected]
         └─ Revision Agent (#3) processes feedback
         └─ May re-trigger generation, assembly, or post-production depending on feedback scope
         └─ Returns to Review Packet

Step 8:  Production Unlock (on approval)
         └─ Production exports unlocked: full-resolution, no watermark, downloadable
         └─ delivery.production.status → "unlocked"
         └─ Audit log: review.approved entry with actor, reason, timestamp

Step 9:  Localization (#18) [OPTIONAL, per target market]
         └─ Translation of text overlays, subtitles
         └─ Cultural adaptation (imagery, color sensitivity, local references)
         └─ Dubbing coordination: Localization requests → Voice Management (#20) executes → Post-Production (#17) integrates
         └─ Generate localized production exports

Step 10: Campaign Multiplication (W6) [OPTIONAL]
         └─ Hook swap variants (different opening hooks from Hook Library)
         └─ Duration cutdowns (30s → 15s → 6s)
         └─ Aspect ratio variants (9:16 → 1:1 → 16:9)
         └─ A/B test pack generation
         └─ Each variant goes through Post-Production (#17) for finishing

Step 11: Delivery Packaging
         └─ Multi-format exports per platform specs
         └─ Subtitle tracks (SRT, VTT) per language
         └─ Dubbed versions with audio + subtitle files
         └─ Branded thumbnails
         └─ Download URLs generated

Step 12: Performance Signal Collection (#22) [ASYNC, post-delivery]
         └─ T+24h: Initial engagement metrics (views, likes, comments)
         └─ T+48h: Engagement velocity (growth rate, share ratio)
         └─ T+7d: Medium-term performance (saves, click-through)
         └─ T+30d: Long-term performance (conversion correlation)

Step 13: Feedback Signal Distribution
         └─ Hook weight updates → Hook Library (#11)
         └─ Template priority updates → Template Library
         └─ Family routing adjustments → Provider Routing (#9)
         └─ Strategy rebalancing signals → Strategy Engine (#21)

Step 14: Audit Trail Logging (Layer 3)
         └─ All decisions affecting money, access, or content delivery → audit_log
         └─ Immutable, append-only, 7-year retention
         └─ GDPR Article 15/17 support
```

---

## SECTION F — Memory/State Architecture

### Database Tables

| Table | Source Doc | Purpose | Key Fields |
|-------|-----------|---------|------------|
| `plan_objects` | `PLAN_OBJECT_SCHEMA.md` | Central initiative contract | plan_id, brand_id, version, status, intent, routing, generation_config, variant_config, cost_estimate, budget_check, capacity_check, risk_assessment, dependencies, latency_tier |
| `plan_versions` | `PLAN_OBJECT_SCHEMA.md` | Immutable version snapshots | plan_id, version, changed_fields, previous_values, changed_by, reason |
| `plan_dependencies` | `PLAN_OBJECT_SCHEMA.md` | DAG-style blocking/informing relationships | plan_id, depends_on_plan_id, dependency_type (blocks/informs), status |
| `jobs` | `PIPELINE_CONTRACTS.md` | Job execution records | job_id, brand_id, family, status, brief, created_at, completed_at |
| `job_stages` | `PIPELINE_CONTRACTS.md` | **Billing source of truth** — per-stage cost tracking | job_id, stage, cost (JSONB: provider, model, cost_usd, tier) |
| `artifacts` | `PIPELINE_CONTRACTS.md` | Generated asset metadata | artifact_id, job_id, family, type, storage_url, metadata |
| `touchpoint_events` | `PIPELINE_CONTRACTS.md` | Layer 0 raw observability signals | job_id, stage, module_id, provider_id, action, tier, status, cost_usd, latency_ms, metadata (max 1KB) |
| `event_bus` | `OBSERVABILITY_CONTRACTS.md` | Layer 1 correlation & replay | correlation_id, parent_event_id, sequence_num, job_id, module_id, event_type, context (max 512 bytes) |
| `audit_log` | `OBSERVABILITY_CONTRACTS.md` | Layer 3 immutable compliance trail | actor_type, actor_id, action, resource_type, resource_id, reason, change_summary, ip_address (7-year retention, append-only) |
| `performance_signals` | `engines/PERFORMANCE_FEEDBACK_ENGINE.md` | Post-publish engagement metrics | plan_id, platform, metrics (likes, comments, shares, views), collected_at |
| `feedback_signals` | `engines/PERFORMANCE_FEEDBACK_ENGINE.md` | Derived optimization signals | target_module, signal_type, weight_delta, confidence |
| `provider_status` | `engines/PROVIDER_ROUTING_POLICY.md` | Provider health tracking | provider_id, status, last_check, failure_count, p95_latency_ms |
| `forecast_runs` | `engines/STRATEGY_ENGINE.md` | Dry-run simulation results | brand_id, scenario, estimated_cost, capacity_risk, sla_risk |
| `plan_templates` | `engines/STRATEGY_ENGINE.md` | Reusable campaign blueprints | template_id, vertical, family_mix, schedule_pattern |
| `hooks` | `pipelines/HOOK_LIBRARY_ENGINE_DESIGN.md` | Performance-ranked hook patterns | hook_id, style, text, industry, platform, performance_score |
| `brand_profiles` | `engines/BRAND_VOICE_DNA_ENGINE.md` | Brand identity + voice | brand_id, name, colors, fonts, industry, voice_profile (JSONB) |
| `voice_generations` | `engines/VOICE_MANAGEMENT_ENGINE.md` | Per-TTS/dub/clone call cost detail | voice_id, job_id, mode, cost_usd, quality_score |

### Materialized Views (Pre-Computed Dashboards)

| View | Refresh Interval | Source | Purpose |
|------|-------------------|--------|---------|
| `mv_provider_health` | 5 min | `touchpoint_events` | Provider uptime, success rate, P50/P95/P99 latency, cost |
| `mv_module_performance` | 15 min | `touchpoint_events` | Module execution counts, failure rates, avg/P95 latency |
| `mv_brand_analytics` | 30 min | `jobs` + `job_stages` | Per-brand weekly spend, job count, turnaround, revision rate |
| `mv_family_throughput` | 15 min | `jobs` | Per-family daily throughput, delivery rate, P95 pipeline time |

### Storage

- **Supabase Storage**: All generated artifacts (videos, images, audio, thumbnails)
- **Supabase Auth**: User authentication and session management
- **Data Retention**: Touchpoints 90d full → aggregate → archive; Event Bus 90d full → 365d compressed → purge; Audit Trail 7 years minimum

---

## SECTION G — Integration Architecture

### Primary Integrations

| System | Role | Implementation Status | Pipeline Position |
|--------|------|----------------------|-------------------|
| **Supabase** | Database, auth, storage, edge functions, task queue | Platform selected — not yet configured for Brandflow tables | Infrastructure layer — all layers |
| **Kie AI** | Primary video provider (Veo3, Kling 2.6), GPT-4o Image, Suno V5 music | API documented — not yet integrated | Generation layer — F1, F2, F3, F5, F7, F8 |
| **BytePlus** | Seedance 1.0 (video fallback), SeedEdit 3.0 (image), Seedream 5.0 (image), VOD (subtitles/watermark/enhancement) | API documented — not yet integrated | Generation + Post-Production — all families |
| **WaveSpeed AI** | Kling 2.6 Pro (video), nano-banana-pro (image) | API documented — not yet integrated | Generation layer — image families, video fallback |
| **ElevenLabs** | TTS, voice cloning, dubbing (primary voice provider) | API documented — not yet integrated | Voice generation — F1, F2, F5, localization |
| **Fal.ai** | Sync Labs Lipsync, ByteDance LatentSync, Whisper (transcription), FFmpeg API | API documented — not yet integrated | Post-production — lip-sync, transcription, assembly |
| **Runway** | Gen-4 video generation (fallback) | API documented — not yet integrated | Generation fallback |
| **Pika** | Pika 2.2 video generation (fallback) | API documented — not yet integrated | Generation fallback |
| **Suno / Udio** | Music generation | API documented — not yet integrated | Music Engine (#7) — parallel with video generation |
| **Firecrawl** | Web scraping for Brand Voice DNA extraction + Hook Library seeding + competitor intelligence | API documented — not yet integrated | Onboarding + periodic data enrichment |
| **Lovable AI Gateway** | Gemini for vision analysis + content generation (text) | Platform available | Intelligence layer — Asset Analyzer, Creative Director Agent |
| **OpenAI** | GPT-4o Vision (fallback), DALL-E 3 (fallback image) | API documented — not yet integrated | Fallback intelligence + image generation |
| **FFmpeg** | Video assembly, transitions, audio mixing, format export | Available as binary | Assembly Engine (#8) — post-generation |

### Planned Integrations (Not Yet Documented)

| System | Planned Role | Status |
|--------|-------------|--------|
| **Meta Graph API** | Social publishing (Instagram, Facebook) | Planned — no spec |
| **TikTok API** | Social publishing | Planned — no spec |
| **Google Trends** | Trend signals for Strategy Engine | Mentioned — no spec |
| **TikTok Creative Center** | Trend signals for Hook Library | Mentioned — no spec |
| **LangGraph** | Agent orchestration framework | Mentioned in some docs — no integration spec |

### Provider Routing Hierarchy

| Capability | Primary | Fallback 1 | Fallback 2 |
|-----------|---------|------------|------------|
| Video (F1, F3, F5, F7) | Kie AI Veo3 | BytePlus Seedance 1.0 | Kling 2.6 (WaveSpeed) |
| Video (F2 Spokesperson) | Kie AI Kling 2.6 | BytePlus Seedance 1.0 | — |
| Image | WaveSpeed | BytePlus SeedEdit 3.0 | — |
| Post-Production | BytePlus VOD | FFmpeg (local) | — |
| Voice/TTS | ElevenLabs | BytePlus VOD | — |
| Music | Suno V5 | Udio | — |
| Vision Analysis | Gemini (Lovable Gateway) | GPT-4o Vision | — |

---

## SECTION H — Current Gaps / Structural Weaknesses

### Critical Gaps

| # | Gap | Severity | Impact |
|---|-----|----------|--------|
| 1 | **All 24 modules are documentation-only** — zero implementation exists | 🔴 Critical | No functionality is operational |
| 2 | **Creative Direction Engine (#23) has no reasoning logic** — spec exists but no ad angle, hook selection, or scene architecture code | 🔴 Critical | Biggest commercial gap — system is a prompt rewriter, not a creative strategist |
| 3 | **No research/competitor intelligence engine** — mentioned in FEATURE_GAPS.md but no module number assigned | 🔴 Critical | Users create content in a vacuum with no market context |
| 4 | **F9 Image Template missing from PIPELINE_CONTRACTS.md** — F9 referenced in pricing but has no formal family contract | 🟡 High | Inconsistency between pricing and technical architecture |

### Structural Weaknesses

| # | Weakness | Severity | Detail |
|---|----------|----------|--------|
| 5 | **No memory/learning persistence layer** | 🟡 High | Performance Feedback (#22) collects signals but no long-term brand learning memory exists — system doesn't accumulate knowledge about what works for each brand |
| 6 | **Camera motion is still text-hint dependent** | 🟡 High | Structured camera vocabulary defined but providers interpret natural language; no guaranteed execution fidelity |
| 7 | **Character consistency ~85%** | 🟡 High | No provider-native identity embeddings available; text descriptors + end-frame passthrough is the best current approach |
| 8 | **No social publishing integration** | 🟡 High | Delivery stops at export — no Meta/TikTok API push; users must manually post |
| 9 | **Duplicate planning logic between #21 and #23** | 🟡 Medium | Strategy Engine and Creative Direction both perform "intake" with overlapping schemas; unclear boundary |
| 10 | **No user preference learning** | 🟡 Medium | System doesn't learn from approval/rejection patterns to improve future suggestions |
| 11 | **No A/B test result ingestion** | 🟡 Medium | Campaign Multiplication generates variants but no closed-loop measurement of which variant won |
| 12 | **Hook Library requires manual/Firecrawl seeding** | 🟡 Medium | No automated platform API scraping; hook performance data depends on external enrichment |
| 13 | **No explicit trust/explainability layer** | 🟡 Medium | No module explains "why this angle was chosen" to users beyond Plan Review Gate display |
| 14 | **Weak research integration** | 🟡 Medium | No deep_search, no category intelligence, no market research module; content generation has no external market awareness |

### Schema/Contract Gaps

| # | Gap | Location |
|---|-----|----------|
| 15 | No `jobs` table CREATE statement in any doc — referenced but never defined | `PIPELINE_CONTRACTS.md` |
| 16 | No `brand_profiles` table CREATE statement — referenced in Brand Voice DNA but schema not formalized | `engines/BRAND_VOICE_DNA_ENGINE.md` |
| 17 | No `artifacts` table CREATE statement — contract defined as JSON but no SQL | `PIPELINE_CONTRACTS.md` |
| 18 | `performance_signals` and `feedback_signals` tables referenced but no CREATE statements | `engines/PERFORMANCE_FEEDBACK_ENGINE.md` |
| 19 | `voice_generations` table referenced but no CREATE statement | `engines/VOICE_MANAGEMENT_ENGINE.md` |
| 20 | `hooks` table referenced but no CREATE statement | `pipelines/HOOK_LIBRARY_ENGINE_DESIGN.md` |

---

## SECTION I — Recommended Insertion Points for Enterprise Upgrade

> **Note**: This section identifies WHERE new capabilities should be inserted. It does NOT redesign the architecture.

### New Module Insertion Points

| Capability | Recommended Position | Insertion Point | Suggested Module # |
|-----------|---------------------|----------------|-------------------|
| **Research/Competitor Intelligence** | Between Strategy Engine (#21) and Creative Direction (#23) | After plan_object creation, before creative reasoning | #25 |
| **Market/Category Intelligence** | Alongside Research module | Feeds into Creative Direction for competitive positioning | Part of #25 |
| **Social Publishing** | After Delivery, before Performance Feedback | Automates posting to connected social accounts | #26 |
| **User Preference Learning** | Extension of Performance Feedback (#22) | Ingests approval/rejection patterns to personalize suggestions | Extend #22 |
| **A/B Test Result Ingestion** | Extension of Performance Feedback (#22) | Connects variant outcomes back to Campaign Multiplication decisions | Extend #22 |

### Layer Insertion Points

| New Layer | Between | Purpose |
|-----------|---------|---------|
| **Research & Intelligence** | Strategy (L6) and Intelligence (L5) | External market awareness, competitor monitoring, trend detection |
| **Trust & Explainability** | Alongside Approval (L2) | "Why this angle" explanations, confidence scores, alternative options shown |
| **Brand Memory** | Between Learning (L0) and Strategy (L6) | Long-term brand knowledge accumulation, preference patterns, historical performance |

### Pre-Generation Flow Insertion Points

```
Current:  Intent → Strategy (#21) → Budget → Capacity → Creative Direction (#23) → ...
Upgraded: Intent → Strategy (#21) → Budget → Capacity → [RESEARCH (#25)] → Creative Direction (#23) → ...
                                                         ↑
                                                    Insert here: competitor analysis,
                                                    trend signals, category intelligence
```

### Post-Generation Flow Insertion Points

```
Current:  ... → Delivery → Performance Feedback (#22)
Upgraded: ... → Delivery → [SOCIAL PUBLISHING (#26)] → Performance Feedback (#22) → [BRAND MEMORY UPDATE]
                            ↑                                                        ↑
                       Insert here: auto-post                               Insert here: accumulate
                       to connected accounts                                long-term brand learning
```

### Missing SQL Schema Priority

To make the architecture implementation-ready, these CREATE statements should be formalized:

1. `jobs` table (core — everything references it)
2. `brand_profiles` table (core — every family uses it)
3. `artifacts` table (core — all generated content)
4. `hooks` table (Hook Library)
5. `voice_generations` table (Voice Management)
6. `performance_signals` + `feedback_signals` tables (Performance Feedback)

---

## Cross-References

| Document | Purpose |
|----------|---------|
| `ENGINE_MODULE_REGISTRY.md` | Master index of 24 engine modules |
| `PIPELINE_CONTRACTS.md` | Family contracts, shared patterns, cost tracking |
| `PLAN_OBJECT_SCHEMA.md` | Plan object schema with versioning, budget, capacity, dependencies, SLA |
| `OBSERVABILITY_CONTRACTS.md` | 3-layer observability: Event Bus, Metrics, Audit Trail |
| `BRANDFLOW_PRICING_STRATEGY.md` | Tier pricing tied to pipeline costs |
| `BRANDFLOW_FEATURE_GAPS.md` | Feature expansion roadmap (7 gaps) |
| `engines/BUDGET_GOVERNANCE.md` | Spend caps, burn rate, tier downgrade |
| `BRANDFLOW_MVP_EXECUTION_ROADMAP.md` | MVP execution sequence |
| `BRANDFLOW_UX_FLOW_AUDIT.md` | UX flow audit |
| Individual engine docs (`engines/*.md`) | Per-module detailed specifications |
| Individual pipeline docs (`pipelines/*.md`) | Per-family pipeline specifications |
