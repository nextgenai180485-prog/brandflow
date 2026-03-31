

# Remediation Plan: Brandflow System Gaps → Production-Grade

Closes 11 gaps across pipelines, engines, and docs. All changes are markdown design documents — no code changes.

---

## Files to Create (11 new docs)

| # | File | Purpose |
|---|------|---------|
| 1 | `docs/engines/BRAND_VOICE_DNA_ENGINE.md` | Full engine spec: voice extraction, `voice_signature.json` schema, injection points across F1-F8 |
| 2 | `docs/engines/CHARACTER_CONSISTENCY_ENGINE.md` | End-frame pass-through, canonical descriptor block, `character_identity_embedding` persistence |
| 3 | `docs/engines/PROVIDER_ROUTING_POLICY.md` | Fallback chains for video/image/lip-sync/music, health-check registry, `provider_status_registry.json` schema |
| 4 | `docs/engines/SOCIAL_CAROUSEL_SCHEMA.md` | Instagram/LinkedIn carousel slide spec, template-driven image composer inputs/outputs |
| 5 | `docs/engines/TEMPLATE_LIBRARY_OPERATIONS.md` | 50-template launch target, 10 categories, quality/usage/conversion scoring, curation workflow |
| 6 | `docs/engines/UGC_VOICEOVER_EXTENSION.md` | Optional voice overlay lane for F1: ElevenLabs TTS, script auto-gen, ambient mix, persona library |
| 7 | `docs/engines/SPOKESPERSON_MOTION_VARIANT_ENGINE.md` | 3-candidate idle motion generation, naturalness/gesture/lip-sync scoring, auto-select |
| 8 | `docs/engines/AD_CREATOR_SCHEMA.md` | Nested object prompt schema replacing stringified JSON in F7 |
| 9 | `docs/engines/CORE_ELEMENTS_BOARD_V2.md` | Slot schema with named slots, preview overlays, partial regeneration via SeedEdit 3.0 |
| 10 | `docs/ENGINE_MODULE_REGISTRY.md` | Master registry of all engine modules with status, owner family, and cross-family adoption |
| 11 | `docs/PIPELINE_CONTRACTS.md` | Standardized input/output contracts for all 8 families referencing engine modules |

---

## Files to Update (8 existing pipeline docs + 3 existing docs)

### Section 1 — Brand Voice DNA (new engine + updates to 4 pipelines)

**`docs/engines/BRAND_VOICE_DNA_ENGINE.md`** (new):
- Inputs: brand description, existing posts, tone sliders, industry, audience, value props
- Output: `voice_signature.json` with `tone_profile`, `sentence_structure_profile`, `lexical_bias`, `cta_patterns`, `hook_preferences`, `emoji_policy`, `platform_variations`
- Extraction pipeline: Firecrawl scrape → Gemini analysis → JSONB storage in `brand_profiles.voice_profile`
- Injection contract: prepended to every content generation prompt as a `## Brand Voice Context` block

**Pipeline updates** — append "Brand Voice DNA Integration" subsection to Enterprise Engine sections of:
- `docs/pipelines/SOCIAL_CONTENT_PIPELINE.md` (F4) — inject into Stage 2 system prompt
- `docs/pipelines/CINEMATIC_AD_PIPELINE.md` (F5) — inject into script generation
- `docs/pipelines/AD_CREATOR_PIPELINE.md` (F7) — inject into Creative Director agent
- `docs/pipelines/CREATIVE_CLONER_PIPELINE.md` (F8) — inject into prompt generation

### Section 2 — Character Consistency (new engine + updates to 3 pipelines)

**`docs/engines/CHARACTER_CONSISTENCY_ENGINE.md`** (new):
- `character_consistency_context.json`: canonical descriptor block (appearance, outfit, expression, distinguishing features)
- End-frame → next-scene start-frame passthrough for multi-scene families
- `character_seed_reference` persisted per initiative
- `character_identity_embedding` storage for cross-session consistency

**Pipeline updates** — append "Character Consistency Integration" subsection to:
- `docs/pipelines/UGC_VIDEO_PIPELINE.md` (F1) — inject descriptor into each scene prompt
- `docs/pipelines/CINEMATIC_AD_PIPELINE.md` (F5) — end-frame passthrough between scenes
- `docs/pipelines/CREATIVE_CLONER_PIPELINE.md` (F8) — inject descriptor from template analysis

### Section 3 — Provider Fallback (new engine)

**`docs/engines/PROVIDER_ROUTING_POLICY.md`** (new):
- Fallback chains:
  - Video: Kie AI → Runway → Pika
  - Image: WaveSpeed → OpenAI Images → SDXL
  - Lip-sync: Sync Labs → LatentSync → Wav2Lip
  - Music: Suno → Udio
- Health-check polling: 60s interval, 3-strike failover
- `provider_status_registry.json` schema: provider, status, latency_p95, last_checked, error_count
- Auto-recovery: re-enable primary after 5min healthy

### Section 4 — Image Template Engine → F4 (new schema + F4 update)

**`docs/engines/SOCIAL_CAROUSEL_SCHEMA.md`** (new):
- `TemplateDrivenImageComposer` inputs: brand_palette, composition_template, product_anchor, layout_style, platform_type
- Carousel slide schema: `{ slides: [{ image_url, headline, body, cta }] }`
- Platform specs: Instagram (1:1, max 10 slides), LinkedIn (1:1, max 20)

**Update `docs/pipelines/SOCIAL_CONTENT_PIPELINE.md`**:
- Add Stage 2B: Template-driven image generation replacing generic DALL-E/Seedream prompts
- Reference `IMAGE_TEMPLATE_ENGINE_DESIGN.md` for Seedream 5.0 Lite multi-image fusion
- Add carousel output format alongside single-image

### Section 5 — Template Library Operations (new doc)

**`docs/engines/TEMPLATE_LIBRARY_OPERATIONS.md`** (new):
- 50-template launch target across 10 categories: ugc testimonial, product reveal, offer announcement, founder story, before-after, listicle carousel, problem-solution, seasonal promo, feature spotlight, educational micro-content
- Scoring: `template_quality_score` (manual 1-10), `template_usage_frequency` (auto), `template_conversion_rank` (derived from downstream engagement)
- Curation workflow: source → write base_prompt → tag → quality review → seed to DB
- Retirement policy: usage_count < 5 after 30 days → archive

### Section 6 — Core Elements Board V2 (new doc + F6 update)

**`docs/engines/CORE_ELEMENTS_BOARD_V2.md`** (new):
- Named slot schema: `slot_1: wireframe`, `slot_2: character`, `slot_3: environment`, `slot_4: product`
- Preview overlay UI showing highlighted placement zones
- Partial regeneration via SeedEdit 3.0: `character_only`, `product_only`, `environment_only`, `layout_only`

**Update `docs/pipelines/CORE_ELEMENTS_BOARD.md`**:
- Reference V2 spec for slot naming and partial regen

### Section 7 — UGC Voiceover (new doc + F1 update)

**`docs/engines/UGC_VOICEOVER_EXTENSION.md`** (new):
- Optional `VoiceOverlayLane` for F1
- ElevenLabs integration: script auto-generation from scene descriptions, voice style matching to brand persona
- Ambient mix: voice at 100% vol, background at 25% vol
- Voice persona library: curated ElevenLabs voice IDs mapped to UGC archetypes (young creator, expert, friend)

**Update `docs/pipelines/UGC_VIDEO_PIPELINE.md`**:
- Add optional Stage 6B: Voice overlay lane (parallel to video generation)
- Assembly Engine updated to mix voice + music + video

### Section 8 — Spokesperson Motion Variants (new doc + F2 update)

**`docs/engines/SPOKESPERSON_MOTION_VARIANT_ENGINE.md`** (new):
- Generate 3 Kling 2.6 idle-motion candidates per spokesperson photo
- Score each: `naturalness_score`, `gesture_density_score`, `lip_sync_alignment_score`
- Auto-select highest composite score; user can override via Plan Review Gate

**Update `docs/pipelines/AI_SPOKESPERSON_PIPELINE.md`**:
- Stage 5B updated: generate 3 variants → score → select best → proceed to lip-sync

### Section 9 — Ad Creator Serialization Fix (new schema + F7 update)

**`docs/engines/AD_CREATOR_SCHEMA.md`** (new):
- Replace stringified JSON video prompt with nested object:
```text
video_prompt:
  subject: ...
  environment: ...
  action: ...
  camera: ...
  lighting: ...
  mood: ...
```
- Aligns with SEALCaM standard

**Update `docs/pipelines/AD_CREATOR_PIPELINE.md`**:
- Stage 3 output schema updated to reference nested object format

### Section 10 — Documentation Sync (2 new index docs)

**`docs/ENGINE_MODULE_REGISTRY.md`** (new):
- Table of all engine modules (original 11 + 7 new from this remediation = 18 total)
- Columns: module name, doc path, owner family, adoption status per family

**`docs/PIPELINE_CONTRACTS.md`** (new):
- Standardized input/output contract per family
- Which engine modules each family consumes
- Cross-references to all engine and pipeline docs

### Section 11 — Cross-Family Engine Audit Update

**Update `docs/pipelines/CROSS_FAMILY_ENGINE_AUDIT.md`**:
- Add modules 12-18 to the summary table:
  - 12: Brand Voice DNA Engine
  - 13: Character Consistency Engine
  - 14: Provider Routing Layer
  - 15: Template-Driven Image Composer
  - 16: Motion Variant Selector
  - 17: UGC Voiceover Extension
  - 18: Prompt Schema Normalizer
- Update adoption matrix to include new modules

---

## Summary

| Section | Gap | Fix | Files Touched |
|---------|-----|-----|---------------|
| 1 | Brand voice generic | Brand Voice DNA Engine | 1 new + 4 updated |
| 2 | Character drift | Consistency Controller | 1 new + 3 updated |
| 3 | Single-provider risk | Fallback routing | 1 new |
| 4 | F4 generic visuals | Template-driven images + carousel | 1 new + 1 updated |
| 5 | F8 template cold-start | Library operations + 50 templates | 1 new |
| 6 | CEB slot fragility | Named slots + partial regen | 1 new + 1 updated |
| 7 | F1 no voice | Voiceover extension | 1 new + 1 updated |
| 8 | F2 stiff motion | Motion variant selector | 1 new + 1 updated |
| 9 | F7 stringified prompts | Nested object schema | 1 new + 1 updated |
| 10 | Doc fragmentation | Registry + contracts index | 2 new |
| 11 | Audit outdated | Updated module list | 1 updated |

**Total**: 11 new files + 12 file updates = 23 file operations

