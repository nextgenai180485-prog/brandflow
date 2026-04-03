# Strategy Object Builder

> **Status**: Design reference  
> **Last updated**: 2026-04-03  
> **Owner**: Cross-family  
> **Depends on**: Module #26 (Decision Engine), Module #23 (Creative Direction Engine)

---

## Purpose

Transform Decision Engine output (strategy_object.json) into structured, deterministic generation instructions usable by each generation family (F1–F9). This layer bridges the gap between "what we decided to make" and "how each family should execute it."

Without this layer, families would need to interpret raw strategy objects differently, leading to inconsistent creative execution.

---

## Responsibilities

| Responsibility | Description |
|----------------|-------------|
| Family-Specific Transformation | Convert strategy_object fields into family-native input format |
| Prompt Scaffolding | Build initial prompt scaffolds based on angle, hook, and tone decisions |
| Asset Selection Packaging | Resolve asset_selection_strategy into concrete artifact references |
| Scene Architecture Alignment | Map emotional arc and angle into scene-level directives (for video families) |
| Format/Platform Constraint Injection | Apply platform-specific constraints (duration, aspect ratio, character limits) |
| Variant Planning Handoff | Convert testing_plan into concrete variant generation instructions |

---

## Input

```json
{
  "strategy_object": "ref: Decision Engine #26 output",
  "creative_direction": "ref: Creative Direction Engine #23 output (for video families)",
  "plan_object": "ref: Plan Object Schema",
  "brand_profile": "ref: brand_profiles record",
  "platform_constraints": {
    "instagram_reel": { "max_duration_s": 90, "aspect_ratio": "9:16", "caption_max_chars": 2200 },
    "tiktok": { "max_duration_s": 180, "aspect_ratio": "9:16", "caption_max_chars": 4000 },
    "linkedin": { "max_duration_s": 600, "aspect_ratio": "16:9 | 1:1", "caption_max_chars": 3000 }
  }
}
```

---

## Output: Generation Instructions

### Per-Family Output Format

#### F1 UGC Video Instructions

```json
{
  "family": "F1",
  "generation_instructions": {
    "angle": "transformation",
    "hook": { "style": "before_after", "text": "Watch what happened after just 2 weeks..." },
    "tone": "authentic, casual, testimonial",
    "scene_count": 3,
    "scenes": [
      { "purpose": "hook", "duration_s": 3, "direction": "Close-up reaction shot" },
      { "purpose": "build", "duration_s": 7, "direction": "Product application / transformation reveal" },
      { "purpose": "cta", "duration_s": 5, "direction": "Results + call to action" }
    ],
    "voice_config": { "enabled": true, "tone": "enthusiastic, natural", "script_seed": "string" },
    "music_config": { "mood": "upbeat", "energy": "medium" },
    "platform_constraints": { "duration_s": 15, "aspect_ratio": "9:16" },
    "asset_refs": ["artifact_id_1", "artifact_id_2"],
    "brand_voice_injection": "JSONB ref",
    "variants": [
      { "variant_id": 1, "dimension": "hook_style", "override": { "hook": { "style": "question" } } }
    ]
  }
}
```

#### F4 Social Content Instructions

```json
{
  "family": "F4",
  "generation_instructions": {
    "angle": "education",
    "hook": { "style": "statistic", "text": "92% of medspa clients say..." },
    "tone": "authoritative, warm",
    "platforms": ["instagram", "linkedin", "tiktok"],
    "per_platform": {
      "instagram": { "format": "carousel", "slide_count": 5, "cta": "Save this for later" },
      "linkedin": { "format": "text_post", "max_chars": 1500, "cta": "Link in comments" },
      "tiktok": { "format": "caption_only", "max_chars": 300, "cta": "Follow for more" }
    },
    "image_generation": { "template_id": "uuid | null", "style_direction": "string" },
    "brand_voice_injection": "JSONB ref"
  }
}
```

#### F5 Cinematic Ad Instructions

```json
{
  "family": "F5",
  "generation_instructions": {
    "angle": "lifestyle",
    "hook": { "style": "bold_claim", "text": "string" },
    "tone": "aspirational, premium",
    "scene_architecture": "ref: Creative Direction #23 output (scene_architecture[])",
    "camera_presets": "ref: Camera Motion #24",
    "emotional_arc": "ref: Creative Direction #23 output (emotional_arc)",
    "offer_emphasis": "ref: Creative Direction #23 output (offer_emphasis)",
    "voice_config": { "enabled": true, "mode": "tts", "voice_preset_id": "uuid" },
    "music_config": { "mood": "cinematic", "energy": "building" },
    "platform_constraints": { "duration_s": 30, "aspect_ratio": "9:16" },
    "asset_refs": ["artifact_id_1"],
    "brand_voice_injection": "JSONB ref",
    "variants": []
  }
}
```

---

## Transformation Rules

### Deterministic Mapping

| Strategy Field | Family Field | Transformation |
|---------------|-------------|----------------|
| `angle.type` | Scene purpose/direction | Maps angle to scene-level narrative beats |
| `hook_type.style` | Opening scene directive | Translates hook style to visual/verbal opening |
| `tone_profile` | Voice/script/visual tone | Injected into every generation prompt |
| `cta_strategy` | Final scene directive | Maps CTA type to ending scene pattern |
| `platform_priority` | Platform-specific constraints | Selects duration, aspect ratio, character limits |
| `asset_selection_strategy` | Concrete artifact references | Resolves reuse candidates to storage URLs |
| `testing_plan` | Variant generation specs | Creates N variant instruction sets with overrides |

### Platform Constraint Matrix

| Platform | Max Duration | Aspect Ratio | Caption Limit | Special |
|----------|-------------|--------------|---------------|---------|
| Instagram Reel | 90s | 9:16 | 2200 chars | Cover image required |
| TikTok | 180s | 9:16 | 4000 chars | Hashtag strategy |
| YouTube Short | 60s | 9:16 | 100 chars title | Thumbnail required |
| LinkedIn Video | 600s | 16:9 or 1:1 | 3000 chars | Professional tone bias |
| Facebook Reel | 90s | 9:16 | 2200 chars | — |
| Instagram Post | — | 1:1 or 4:5 | 2200 chars | Alt text required |
| LinkedIn Post | — | — | 3000 chars | No hashtag spam |

---

## Consumers

| Consumer | What They Receive |
|----------|------------------|
| F1–F9 Family Orchestrators | Family-specific generation_instructions |
| Creative Director Agent (#1) | Structured instructions for AGENT framework reasoning |
| SEALCaM Prompt Builder (#5) | Scene-level directives for prompt construction |
| Assembly Engine (#8) | Scene architecture with timing and transitions |
| Campaign Multiplication (W6) | Variant specs for hook swap / cutdown generation |
