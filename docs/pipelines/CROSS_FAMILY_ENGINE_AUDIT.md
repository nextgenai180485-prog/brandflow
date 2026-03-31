# Cross-Family Engine Audit: Enterprise-Grade Pattern Gaps

> **Status**: Design reference — not yet implemented  
> **Scope**: All 8 pipeline families + 2 engine designs  
> **Purpose**: Identify enterprise patterns that exist in one family but should be shared across all

---

## 1. Creative Director AI Agent

**Exists in**: F7 Ad Creator (AGENT framework + Think Tool), partially F5 Cinematic Ad ("Multimedia Ad Director")  
**Missing from**: F1 UGC, F2 AI Spokesperson, F3 Product Videography, F8 Creative Cloner

The Ad Creator has a dedicated **Creative Director Agent** using the AGENT framework (Ask, Guidance, Examples, Notation, Tools) with a Think Tool for structured reasoning before generating prompts. The Cinematic Ad has a similar "Multimedia Ad Director" agent. But UGC, AI Spokesperson, Product Videography, and Creative Cloner all use simpler prompt-in/structured-out AI calls with no explicit reasoning step.

**Should adopt**: All families. Every scene planning stage should use:
- The AGENT framework for system prompts (standardized structure)
- A Think Tool / reasoning pass before output
- Structured creative summary output (not just raw prompts)

---

## 2. Pre-Generation Approval Gate

**Exists in**: F7 Ad Creator (concept approval before render), F4 Social Content (approval before publish)  
**Missing from**: F1 UGC, F2 AI Spokesperson, F3 Product Videography, F5 Cinematic Ad, F8 Creative Cloner

Ad Creator shows the creative concept (caption + creative summary) to the user BEFORE spending money on generation. Social Content has an approval gate before publishing. But UGC, AI Spokesperson, Product Videography, Cinematic Ad, and Creative Cloner all go straight from planning to generation with no checkpoint.

**Should adopt**: All video families. At minimum, show users the planned scenes, mood, and estimated output before burning GPU credits. This is the core of the "approval-first" principle from PROJECT.md.

### Proposed Standard

Every family gets a mandatory **Plan Review Gate** between prompt generation and media generation. The user sees:
- Scene count and descriptions
- Mood/style summary
- Estimated generation time and cost tier
- Approve / Reject / Edit prompts

---

## 3. Revision Loop with Feedback Injection

**Exists in**: F7 Ad Creator (Revised Prompt Agent)  
**Missing from**: All other families

When a user rejects the Ad Creator concept, a **Revised Prompt Agent** takes the original brief + rejection comments + original analysis and generates new prompts incorporating feedback. No other family has this — rejection means full restart.

**Should adopt**: All families. Every rejection should feed the user's comments back into the planning agent as revision context, not force a cold restart.

### Proposed Standard

A shared `RevisionAgent` Edge Function that takes:
- Original brief
- Original AI output
- User rejection comments
- Family-specific system prompt

And returns revised prompts for the specific stage that needs rework.

---

## 4. SEALCaM Structured Prompting

**Exists in**: F8 Creative Cloner (mandatory 6-field standard)  
**Recommended but not adopted**: F5 Cinematic Ad, F7 Ad Creator  
**Different format**: F3 Product Videography (YAML: Composition, Lighting, Environment, Action, Refinements, Camera, Aesthetic, Mood)

The Creative Cloner uses SEALCaM (Subject, Environment, Action, Lighting, Camera, Metatokens) as a mandatory 6-field prompting standard. The framework doc says it is "recommended" for Cinematic Ad and Ad Creator but neither actually uses it.

**Should adopt**: F5 Cinematic Ad and F3 Product Videography should standardize on SEALCaM.

### PV YAML → SEALCaM Mapping

| PV YAML Field | SEALCaM Field |
|---------------|---------------|
| Composition | Subject + Camera |
| Lighting | Lighting |
| Environment | Environment |
| Action | Action |
| Refinements | Metatokens |
| Camera | Camera |
| Aesthetic + Mood | Metatokens |

This gives consistent prompts across families, making the template library work cross-family.

---

## 5. Re-entrant State Machine

**Exists in**: F3 Product Videography (Switch node checks existing data, resumes from appropriate stage)  
**Missing from**: All other families

Product Videography has a Switch node that checks what data already exists and resumes from the appropriate stage. If prompts exist but images don't, it skips straight to image generation. No other family has this — they all run linearly from the start.

**Should adopt**: All families. The `job_stages` table already supports this conceptually, but the pipelines need explicit resume-from-stage logic. This enables:
- Editing prompts after generation and re-running only downstream stages
- Retrying a failed stage without restarting
- Manual intervention at any checkpoint

---

## 6. Core Elements Board as Universal Prerequisite

**Exists as**: Standalone F6 pipeline  
**Currently connected to**: F3 Product Videography, F5 Cinematic Ad  
**Missing from**: F1 UGC, F2 AI Spokesperson, F7 Ad Creator, F8 Creative Cloner, Image Template Engine

The Core Elements Board generates a structured character + setting + product composite image. Currently only Cinematic Ad and Product Videography use it. But every family that generates images needs consistent brand visual context.

**Should adopt**: Make Core Elements Board a **brand onboarding step** that auto-generates during brand setup. Store as a permanent brand asset. Then inject it into:
- F1 UGC: as reference for product placement scenes
- F2 AI Spokesperson: as visual context for avatar settings
- F7 Ad Creator: as reference for the Creative Director
- F8 Creative Cloner: as brand context for prompt generation
- Image Template Engine: as brand style reference for Seedream fusion

---

## 7. Vision Analysis Standardization

**Current state**: Six families, three different providers, three different output formats.

| Family | Analysis Provider | Analysis Prompt | Output Format |
|--------|------------------|-----------------|---------------|
| F1 UGC | GPT-4o | Product-focused YAML | YAML |
| F2 AI Spokesperson | GPT-4o | Product + Character YAML | YAML |
| F3 Product Videography | Gemini 3 Pro | Describe character/setting/product | Free text |
| F5 Cinematic Ad | Gemini 3 Pro | Describe character/setting/product | Free text |
| F7 Ad Creator | GPT-4o | Describe product, ignore background | Free text |
| F8 Creative Cloner | Gemini 3 Pro | SEALCaM cinematic breakdown | Structured JSON |

### Proposed Standard

A single `AnalyzeAsset` Edge Function with modes:

| Mode | Returns | Used By |
|------|---------|---------|
| `product` | Structured product YAML (brand, colors, materials, description) | All families |
| `character` | Structured character YAML (appearance, outfit, expression) | F1, F2, F5, F8 |
| `scene` | SEALCaM-structured scene breakdown | F5, F7, F8 |
| `composite` | All three combined | Core Elements Board (F6) |

Standardize on Gemini via Lovable AI Gateway as the vision provider.

---

## 8. Music Generation

**Exists in**: F5 Cinematic Ad (Suno V5), F8 Creative Cloner (Suno V4)  
**Missing from**: F1 UGC, F2 AI Spokesperson, F7 Ad Creator

Cinematic Ad and Creative Cloner generate background music via Suno. UGC and AI Spokesperson produce silent videos. Ad Creator produces videos with no audio layer.

**Should adopt**: Offer music as an optional enhancement for ALL video families. The music generation stage is independent (runs in parallel) and adds ~3 minutes. Make it a toggle: "Add background music?" with mood auto-detected from the brand profile.

---

## 9. Assembly / Post-Production

**Automated in**: F1B UGC Variant B (Fal AI FFmpeg), **F5 Cinematic Ad (Fal AI FFmpeg — 4-step pipeline)**  
**Adopted by**: F8 Creative Cloner (shared Assembly Engine)  
**Available for**: F1A UGC Variant A (music overlay), F2 AI Spokesperson (clip concat + music), F3 Product Videography (music overlay), F7 Ad Creator (music overlay)

F5 Cinematic Ad assembly is now **fully automated** via a 4-step pipeline:
1. **Concat**: `fal-ai/ffmpeg-api/merge-videos` — merge scene videos in order
2. **Audio Mix**: Custom FFmpeg command — background music (25% vol) + voiceover (100% vol)
3. **Transitions**: Optional 0.5s crossfade via FFmpeg `xfade` filter
4. **Export**: Aspect ratio enforcement + Supabase Storage upload

### Shared AssemblyEngine Standard

A shared `AssemblyEngine` module handles:
- Video concatenation (multi-scene families: F1B, F2, F5, F8)
- Music overlay with volume control (all video families when music toggle enabled)
- Voiceover overlay with timing sync (F5 only — has voice lane)
- Fade transitions between scenes (configurable: crossfade, fade-to-black, dissolve)
- Caption/subtitle burn-in (optional, future)
- Final export with aspect ratio enforcement (16:9 or 9:16)

---

## 10. Cost/Quality Tier Routing

**Exists in**: No family currently  
**Referenced in**: PROJECT.md Plan Object (`cost_tier`, `latency_tier` fields)

No family currently has explicit cost-vs-quality routing. Users get whatever model is hardcoded.

### Proposed Standard

Every family should support at least two tiers:

| Tier | Purpose | Models |
|------|---------|--------|
| **Draft/Preview** | Fast iteration, first drafts | veo3_fast, sora2, seedream lite |
| **Final/Production** | Approved content, final render | veo3, sora2-pro, seedream pro |

The planner should auto-select based on whether this is a first draft or a final render after approval.

---

## Summary: Shared Engine Modules to Build Before Any Family

| # | Engine Module | Used By | Purpose |
|---|---------------|---------|---------|
| 1 | **Creative Director Agent** (AGENT framework) | All families | Standardized reasoning + prompt generation |
| 2 | **Plan Review Gate** | All families | Pre-generation approval checkpoint |
| 3 | **Revision Agent** | All families | Feedback-aware prompt regeneration |
| 4 | **Asset Analyzer** | All families | Unified vision analysis (product/character/scene) |
| 5 | **SEALCaM Prompt Builder** | F3, F5, F7, F8 | Structured prompt assembly |
| 6 | **Core Elements Generator** | Brand onboarding | Auto-generate brand board during setup |
| 7 | **Music Engine** | All video families | Optional background music generation |
| 8 | **Assembly Engine** | All video families | FFmpeg merge + audio overlay + export |
| 9 | **Tier Router** | All families | Draft vs production quality routing |
| 10 | **Re-entry Controller** | All families | Resume-from-stage + retry logic |

These 10 modules form the **enterprise engine layer** that sits between the family-specific logic and the provider adapters. Build these first, then each family becomes a thin orchestration config on top.

---

## Build Order Recommendation

```
Phase A — Foundation (no AI calls)
  ├── Re-entry Controller (state machine logic)
  ├── Tier Router (config + routing logic)
  └── Plan Review Gate (approval UI + API)

Phase B — Intelligence (AI-powered)
  ├── Asset Analyzer (unified vision analysis)
  ├── Creative Director Agent (AGENT framework)
  ├── SEALCaM Prompt Builder (structured prompts)
  └── Revision Agent (feedback loop)

Phase C — Media (heavy compute)
  ├── Music Engine (Suno integration)
  ├── Assembly Engine (FFmpeg worker)
  └── Core Elements Generator (brand board)
```

---

## Cross-Reference: Pipeline Docs

| Doc | Family |
|-----|--------|
| `UGC_VIDEO_PIPELINE.md` | F1 — UGC Video |
| `AI_SPOKESPERSON_PIPELINE.md` | F2 — AI Spokesperson |
| `PRODUCT_VIDEOGRAPHY_PIPELINE.md` | F3 — Product Videography |
| `SOCIAL_CONTENT_PIPELINE.md` | F4 — Social Content |
| `CINEMATIC_AD_PIPELINE.md` | F5 — Cinematic Ad |
| `CORE_ELEMENTS_BOARD.md` | F6 — Core Elements Board |
| `AD_CREATOR_PIPELINE.md` | F7 — Ad Creator |
| `CREATIVE_CLONER_PIPELINE.md` | F8 — Creative Cloner |
| `SEALCAM_FRAMEWORK.md` | Shared — Prompting standard |
| `CREATIVE_CLONER_ENGINE_DESIGN.md` | Engine — Zero-effort cloner |
| `IMAGE_TEMPLATE_ENGINE_DESIGN.md` | Engine — Template image recreation |
| `HOOK_LIBRARY_ENGINE_DESIGN.md` | Engine — Performance-driven content intelligence |

---

## 11. Hook Library Engine

**Exists as**: Standalone engine design (`HOOK_LIBRARY_ENGINE_DESIGN.md`)  
**Integrated into**: F4 Social Content, F5 Cinematic Ad, F7 Ad Creator, F8 Creative Cloner  
**Not applicable**: F1 UGC (no text content), F2 AI Spokesperson (prompt-driven, no captions), F3 Product Videography (visual-only), F6 Core Elements Board (no content generation)

A curated database of proven social media hooks, captions, and CTAs — scraped from real platforms, annotated by industry, platform, and performance signals. Every content generation call queries this library FIRST to ground output in real-world performance data.

### Integration Points

| Family | Hook Injection Point | Purpose |
|--------|---------------------|---------|
| F4 Social Content | Pre-generation (Stage 2) | Few-shot examples for platform-optimized captions |
| F5 Cinematic Ad | Script generation (Stage 3) | Narrative hooks for ad scripts |
| F7 Ad Creator | Caption generation (Stage 3) | Engagement-optimized captions |
| F8 Creative Cloner | Script generation (Stage 2) | Proven hooks for recreated ad narratives |

---

## Enterprise Engine Adoption Status

All 8 families have been updated with Enterprise Engine Integration sections. Status:

| Module | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 |
|--------|----|----|----|----|----|----|----|----|
| Creative Director Agent | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅★ | ✅ |
| Plan Review Gate | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅★ | ✅ |
| Revision Agent | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅★ | ✅ |
| Asset Analyzer | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅★ |
| SEALCaM | opt | opt | ✅ | — | ✅ | — | ✅ | ✅★ |
| Core Elements Board | ✅ | ✅ | ✅ | ✅ | ✅ | ★ | ✅ | ✅ |
| Music Engine | ✅ | ✅ | ✅ | — | ✅ | — | ✅ | ✅ |
| Assembly Engine | ✅ | ✅ | ✅ | — | ✅ | — | ✅ | ✅ |
| Tier Router | ✅ | ✅ | ✅ | — | ✅ | — | ✅ | ✅ |
| Re-entry Controller | ✅ | ✅ | ✅★ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hook Library | — | — | — | ✅ | ✅ | — | ✅ | ✅ |

**Legend**: ✅ = adopted, ✅★ = reference pattern (other families should follow this implementation), opt = optional/opt-in, — = not applicable, ★ = is the module itself
