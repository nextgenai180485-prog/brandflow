# Workflow #6 — Campaign Multiplication

> **Status**: Design reference  
> **Last updated**: 2026-03-31  
> **Purpose**: Turn one approved creative asset into many platform-ready variants at scale

---

## Purpose

Campaign Multiplication is the scaling engine. Once a creative is approved, this workflow generates all the variants a brand needs to deploy across platforms, markets, and ad testing campaigns — without re-running the full generation pipeline.

This is what makes Brandflow a **production system** rather than a **generation toy**.

---

## Variant Types

### 1. Aspect Ratio Variants

Re-frame an approved asset for different platforms.

| Platform | Aspect Ratio | Resolution |
|----------|-------------|------------|
| Instagram Stories / TikTok / Reels | 9:16 | 1080×1920 |
| Instagram Feed | 1:1 | 1080×1080 |
| Instagram Feed (portrait) | 4:5 | 1080×1350 |
| YouTube | 16:9 | 1920×1080 |
| Facebook Feed | 16:9 or 1:1 | 1200×628 or 1080×1080 |
| LinkedIn | 16:9 | 1200×628 |
| Pinterest | 2:3 | 1000×1500 |
| Twitter/X | 16:9 | 1200×675 |

**Method**: Intelligent re-crop using subject detection (not just center-crop). For video, re-frame per-scene using subject position data from Asset Analyzer (#4).

### 2. Duration Cutdowns

Create shorter versions from an approved longer asset.

| Cutdown | Use Case |
|---------|----------|
| :60 → :30 | Standard ad cutdown |
| :30 → :15 | Social pre-roll |
| :15 → :06 | Bumper ad |
| :60 → :06 | YouTube bumper from full ad |

**Method**: 
- Creative Director Agent (#1) selects the highest-impact segments
- Assembly Engine (#8) re-cuts with proper transitions
- Hook Library (#11) can swap intro hooks for shorter formats

### 3. Hook Variants

Swap the opening hook while keeping the body/CTA identical.

```json
{
  "variant_type": "hook_swap",
  "source_job_id": "uuid",
  "hooks": [
    { "hook_id": "hook_001", "type": "question", "text": "Still struggling with..." },
    { "hook_id": "hook_002", "type": "statistic", "text": "87% of brands fail at..." },
    { "hook_id": "hook_003", "type": "bold_claim", "text": "This changes everything." }
  ],
  "output": [
    { "variant_id": "uuid", "hook_used": "hook_001", "asset_url": "string" },
    { "variant_id": "uuid", "hook_used": "hook_002", "asset_url": "string" },
    { "variant_id": "uuid", "hook_used": "hook_003", "asset_url": "string" }
  ]
}
```

### 4. Localized Variants

Produce market-specific versions (delegates to Module #18 Localization Engine).

| Component | Adaptation |
|-----------|-----------|
| Captions | Translated + culturally adapted |
| Subtitles | Target language SRT/VTT |
| Voiceover | Dubbed via Voice Engine (#20) |
| Visual text | Re-rendered overlays |
| Imagery | Cultural flag review |

### 5. A/B Testing Packs

Generate structured test sets for ad platforms.

```json
{
  "variant_type": "ab_test_pack",
  "source_job_id": "uuid",
  "test_dimensions": ["hook", "cta", "aspect_ratio"],
  "output": {
    "pack_id": "uuid",
    "variants": [
      {
        "variant_id": "uuid",
        "hook": "question",
        "cta": "Shop Now",
        "aspect_ratio": "9:16",
        "asset_url": "string"
      }
    ],
    "total_variants": 12,
    "recommended_budget_split": "even"
  }
}
```

---

## Workflow Stages

```
Approved Asset
  │
  ├─── Variant Planning
  │      │  Creative Director Agent (#1) determines which variants
  │      │  are feasible from the source asset
  │      │
  │      ▼
  ├─── Variant Generation (parallel)
  │      ├── Aspect ratio re-crops
  │      ├── Duration cutdowns
  │      ├── Hook swaps
  │      ├── Localized versions
  │      └── A/B test combinations
  │      │
  │      ▼
  ├─── Quality Check
  │      │  Each variant passes through:
  │      │  - Brand Voice DNA (#12) alignment check
  │      │  - Character Consistency (#13) verification
  │      │  - Post-Production (#17) polish
  │      │
  │      ▼
  ├─── Review Packet
  │      │  All variants bundled into Review Packet (#19)
  │      │  for batch approval
  │      │
  │      ▼
  └─── Delivery
         All approved variants exported via
         Delivery Engine (#17) with platform-specific
         formatting and metadata
```

---

## Multiplication Plan Schema

The `multiplication_plan` is the planning object that defines the full scope of variant generation before execution begins. It is produced by the Creative Director Agent (#1) based on the source asset and campaign objectives.

```json
{
  "multiplication_plan": {
    "plan_id": "uuid",
    "source_asset_id": "uuid",
    "source_job_id": "uuid (approved parent)",
    "initiative_id": "uuid (ref: PLAN_OBJECT_SCHEMA.md)",
    "family": "F1|F2|F3|F4|F5|F7|F8|F9",
    "variant_count": 12,
    "hook_strategy_set": {
      "enabled": true,
      "count": 3,
      "styles": ["question", "statistic", "bold_claim"],
      "source": "hook_library (#11)"
    },
    "platform_matrix": {
      "instagram_reels": { "aspect_ratio": "9:16", "duration_s": 30 },
      "instagram_feed": { "aspect_ratio": "1:1", "duration_s": 30 },
      "tiktok": { "aspect_ratio": "9:16", "duration_s": 15 },
      "youtube": { "aspect_ratio": "16:9", "duration_s": 60 },
      "linkedin": { "aspect_ratio": "16:9", "duration_s": 30 },
      "twitter": { "aspect_ratio": "16:9", "duration_s": 15 },
      "pinterest": { "aspect_ratio": "2:3", "duration_s": null }
    },
    "testing_pack_enabled": true,
    "testing_dimensions": ["hook", "cta", "aspect_ratio"],
    "localization_matrix": {
      "enabled": true,
      "target_markets": ["ar-SA", "es-MX", "ja-JP"],
      "components": ["subtitles", "dubbed_audio", "visual_text"]
    },
    "tier": "draft | standard | premium",
    "status": "planning | generating | review | approved | delivered"
  }
}
```

---

## Multiplication Job Schema

```json
{
  "multiplication_job": {
    "job_id": "uuid",
    "plan_id": "uuid (ref: multiplication_plan)",
    "source_job_id": "uuid (approved parent)",
    "source_asset_url": "string",
    "family": "F1|F2|F3|F4|F5|F7|F8|F9",
    "requested_variants": [
      {
        "type": "aspect_ratio",
        "params": { "target_ratios": ["9:16", "1:1", "16:9"] }
      },
      {
        "type": "cutdown",
        "params": { "target_durations_s": [30, 15, 6] }
      },
      {
        "type": "hook_swap",
        "params": { "hook_count": 3, "hook_styles": ["question", "statistic", "bold_claim"] }
      },
      {
        "type": "localization",
        "params": { "target_markets": ["ar-SA", "es-MX", "ja-JP"] }
      }
    ],
    "tier": "draft | standard | premium",
    "status": "planning | generating | review | approved | delivered"
  }
}
```

---

## Engine Dependencies

| Engine | Role in Multiplication |
|--------|----------------------|
| #1 Creative Director Agent | Selects best segments for cutdowns, plans hook variants |
| #4 Asset Analyzer | Subject detection for intelligent re-cropping |
| #8 Assembly Engine | Re-cuts, re-frames, re-renders variants |
| #9 Provider & Tier Routing | Routes generation calls per tier |
| #10 Re-entry Controller | Resumes from specific variant if one fails |
| #11 Hook Library | Provides hook alternatives for swap variants |
| #12 Brand Voice DNA | Validates all variants maintain voice consistency |
| #13 Character Consistency | Verifies character appearance across variants |
| #17 Delivery & Post-Production | Polishes + exports each variant |
| #18 Localization Engine | Produces localized variants |
| #19 Review Packet Engine | Bundles all variants for batch review |
| #20 Voice Engine | Re-generates voice for cutdowns/localized versions |

---

## Cross-Family Applicability

| Family | Multiplication Support |
|--------|----------------------|
| F1 UGC Video | ✅ (aspect ratio, cutdowns, hooks, localization) |
| F2 AI Spokesperson | ✅ (aspect ratio, cutdowns, localization) |
| F3 Product Videography | ✅ (aspect ratio, cutdowns) |
| F4 Social Content | ✅ (platform variants — already native) |
| F5 Cinematic Ad | ✅ (full multiplication suite) |
| F6 Core Elements Board | — (single asset, no variants) |
| F7 Ad Creator | ✅ (aspect ratio, hooks, localization) |
| F8 Creative Cloner | ✅ (aspect ratio, cutdowns, hooks) |
| F9 Image Template | ✅ (aspect ratio, localization of text overlays) |

---

## Cost Model

Multiplication variants are significantly cheaper than full generation:

| Variant Type | Cost vs Full Generation |
|-------------|------------------------|
| Aspect ratio re-crop | ~5% (compute only) |
| Duration cutdown | ~10% (AI selection + re-assembly) |
| Hook swap | ~15-25% (new hook generation + re-assembly) |
| Localization | ~30-50% (translation + dubbing + re-render) |
| A/B test pack (N variants) | Sum of individual variant costs |

This pricing advantage is a key selling point: "Generate once, multiply everywhere."
