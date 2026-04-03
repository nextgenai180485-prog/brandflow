

# Plan: Export Complete Brandflow Architecture Document

## What This Delivers

A single comprehensive markdown file (`docs/BRANDFLOW_CURRENT_ARCHITECTURE_EXPORT.md`) containing the full current system architecture across all 10 requested sections, plus an update to `docs/ENGINE_MODULE_REGISTRY.md` to cross-reference this export.

## Document Structure

### SECTION A — Top-Level Architecture Summary
- Product thesis (AI social media operating system, approval-first)
- 9 generation families (F1–F9)
- 24 engine modules + 1 workflow (W6)
- 6 core enterprise workflows
- 4-layer observability stack
- Hybrid orchestration model (Edge Functions + Python workers)
- Trust-based review-safe delivery architecture

### SECTION B — Engine/Module Registry (24 modules)
For each of the 24 modules: name, one-line purpose, category/layer, doc file, implementation status (all are "Designed — not yet implemented"), inputs, outputs, dependencies, and pipeline position.

Modules grouped by layer:
- **Foundation**: #9 Provider Routing, #10 Re-entry Controller, #2 Plan Review Gate
- **Intelligence**: #1 Creative Director Agent, #4 Asset Analyzer, #5 SEALCaM, #3 Revision Agent, #11 Hook Library, #12 Brand Voice DNA
- **Media**: #7 Music Engine, #8 Assembly Engine, #6 Core Elements Generator, #13 Character Consistency, #14 Template Image Composer, #15 Motion Variant Selector, #16 UGC Voiceover
- **Delivery**: #17 Delivery & Post-Production
- **Localization**: #18 Localization & Cultural Adaptation
- **Approval & Scaling**: #19 Review Packet Engine, #20 Voice Management
- **Strategy & Learning**: #21 Strategy Engine, #22 Performance Feedback Engine
- **Premium Cinematic**: #23 Creative Direction Engine, #24 Camera Motion & Transition Engine

### SECTION C — Workflow/Family Registry (9 families + 1 workflow)
For each family (F1–F9) and W6: one-line purpose, engine modules consumed, current state, and gaps. Sourced from PIPELINE_CONTRACTS.md and individual pipeline docs.

### SECTION D — Pre-Generation Pipeline Order
Exact ordered flow:
1. User intent → Strategy Engine (#21) produces plan_object
2. Budget governance pre-flight check
3. Capacity check / queue management
4. **Stage 0: Creative Direction (#23)** — intake, angle selection, hook logic, scene architecture
5. Asset analysis (#4) — vision model scoring of reference images
6. SEALCaM prompt construction (#5)
7. Brand Voice DNA injection (#12)
8. Hook Library query (#11)
9. Creative Director Agent (#1) — AGENT framework reasoning
10. Plan Review Gate (#2) — user approval checkpoint
11. [Revision loop via #3 if rejected]
12. Provider & Tier Routing (#9) — resolve provider + tier
13. Generation trigger

### SECTION E — Post-Generation Pipeline Order
1. Assembly Engine (#8) — FFmpeg stitching with transitions
2. Character Consistency validation (#13) — scene-chain scoring
3. Post-Production (#17) — subtitles, watermark, audio polish, enhancement, thumbnails, export
4. Review Packet (#19) — structured approval artifact
5. Plan Review Gate (#2) — user approval of final output
6. [Revision loop if rejected]
7. Production unlock on approval
8. Localization (#18) — optional, per target market
9. Campaign Multiplication (W6) — variants, cutdowns, hook swaps
10. Delivery packaging — multi-format exports
11. Performance signal collection (#22) — T+24h, T+48h, T+7d, T+30d
12. Feedback signals → Hook Library, Template Library, Provider Routing, Strategy Engine
13. Audit Trail logging (Layer 3)

### SECTION F — Memory/State Architecture
All database tables documented across specs:
- `plan_objects`, `plan_versions`, `plan_dependencies` (Plan Object Schema)
- `jobs`, `job_stages` (Pipeline Contracts — billing source of truth)
- `artifacts` (asset storage metadata)
- `touchpoint_events` (Layer 0 observability)
- `event_bus` (Layer 1 correlation)
- `audit_log` (Layer 3 immutable compliance)
- `performance_signals`, `feedback_signals` (Performance Feedback #22)
- `provider_status` (Provider Routing #9)
- `forecast_runs`, `plan_templates` (Strategy Engine #21)
- `hooks` table (Hook Library #11)
- `brand_profiles.voice_profile` JSONB (Brand Voice DNA #12)
- Materialized views: `mv_provider_health`, `mv_module_performance`, `mv_brand_analytics`, `mv_family_throughput`
- Supabase Storage for all generated artifacts

### SECTION G — Integration Architecture
All external systems:
- **Supabase**: Database, auth, storage, edge functions, task queue
- **Kie AI**: Veo3, Kling 2.6, GPT-4o Image, Suno V5 (primary video/music)
- **BytePlus**: Seedance 1.0, SeedEdit 3.0, Seedream 5.0, VOD (subtitles/watermark/enhancement)
- **WaveSpeed AI**: Kling 2.6 Pro, nano-banana-pro (image)
- **ElevenLabs**: TTS, voice cloning, dubbing
- **Fal.ai**: Sync Labs Lipsync, ByteDance LatentSync, Whisper, FFmpeg API
- **Runway**: Gen-4 (video fallback)
- **Pika**: Pika 2.2 (video fallback)
- **Suno/Udio**: Music generation
- **Firecrawl**: Web scraping for Brand Voice DNA + Hook Library
- **Lovable AI Gateway**: Gemini for vision analysis + content generation
- **OpenAI**: GPT-4o Vision (fallback), DALL-E 3 (fallback)
- **FFmpeg**: Assembly, transitions, audio polish, export
- **Meta Graph API**: Planned for social publishing
- **Google Trends / TikTok Creative Center**: Trend signals for Strategy Engine

### SECTION H — Current Gaps / Structural Weaknesses
Identified from cross-referencing all docs:
1. **All 24 modules are documentation-only** — zero implementation exists
2. **No research/competitor intelligence engine** — mentioned in FEATURE_GAPS.md but no module number
3. **No memory/learning persistence layer** — performance feedback collects signals but no long-term brand learning memory
4. **Creative Direction Engine (#23) has no execution logic** — spec exists, reasoning code does not
5. **Camera motion is still text-hint dependent** on all providers
6. **Character consistency ~85%** — no provider-native identity embeddings
7. **No social publishing integration** — delivery stops at export, no Meta/TikTok API push
8. **No user preference learning** — system doesn't learn from approval/rejection patterns
9. **No A/B test result ingestion** — Campaign Multiplication generates variants but no closed-loop measurement
10. **Hook Library requires manual/Firecrawl seeding** — no automated platform API scraping
11. **Duplicate planning logic** — Strategy Engine (#21) and Creative Direction (#23) both do "intake" with overlapping schemas
12. **Missing F9 Image Template in PIPELINE_CONTRACTS** — F9 mentioned in pricing but not in family contracts
13. **No explicit trust/explainability layer** — no module explains "why this angle was chosen" to users beyond the Plan Review Gate display
14. **Weak research integration** — no deep_search, no category intelligence, no market research module

### SECTION I — Recommended Insertion Points for Enterprise Upgrade
Document insertion points without redesigning:
- Research/Intelligence layer: between Strategy Engine and Creative Direction
- Memory/Learning layer: between Performance Feedback and Strategy Engine
- Trust/Explainability layer: alongside Plan Review Gate
- Competitor Intelligence: as Module #25
- Social Publishing: as Module #26
- User Preference Learning: extend Performance Feedback #22

## Files Changed

| File | Action |
|------|--------|
| `docs/BRANDFLOW_CURRENT_ARCHITECTURE_EXPORT.md` | **Create** — Full 10-section architecture export |
| `docs/ENGINE_MODULE_REGISTRY.md` | **Update** — Add cross-reference to the export doc in Supporting Docs table |

