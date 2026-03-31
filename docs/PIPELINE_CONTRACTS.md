# Pipeline Contracts — Standardized Input/Output Reference

> **Status**: Design reference — master contract for all 8 pipeline families  
> **Last updated**: 2026-03-31  
> **Engine count**: 18 modules — see ENGINE_MODULE_REGISTRY.md

---

## Overview

Each pipeline family has a standardized contract defining its inputs, outputs, and which engine modules it consumes. This document serves as the single reference for integration between families, engines, and the orchestration layer.

---

## Family Contracts

### F1 — UGC Video Pipeline

| Field | Value |
|-------|-------|
| **Input** | Reference image URL, video count, dialogue (optional), model, aspect ratio, special requests |
| **Output** | Individual video clips (Variant A) or single merged video (Variant B) |
| **Primary Deliverable** | MP4 video file(s) |
| **Engine Modules** | Asset Analyzer, Creative Director Agent, Plan Review Gate, Revision Agent, Core Elements Board, Music Engine (optional), Assembly Engine, Re-entry Controller, Provider & Tier Routing, UGC Voiceover (optional), Character Consistency (multi-scene), Brand Voice DNA (dialogue) |
| **Doc** | `pipelines/UGC_VIDEO_PIPELINE.md` |

### F2 — AI Spokesperson (Lip-Sync Talking Head)

| Field | Value |
|-------|-------|
| **Input** | Script, spokesperson photo, voice mode (upload/TTS/clone), aspect ratio |
| **Output** | Lip-synced talking-head video with optional music and captions |
| **Primary Deliverable** | MP4 video file |
| **Engine Modules** | Asset Analyzer, Creative Director Agent (script enhancement), Plan Review Gate, Revision Agent, Hook Library, Music Engine (optional), Assembly Engine, Re-entry Controller, Provider & Tier Routing, Motion Variant Selector, Brand Voice DNA |
| **Doc** | `pipelines/AI_SPOKESPERSON_PIPELINE.md` |

### F3 — Product Videography

| Field | Value |
|-------|-------|
| **Input** | Product image, core elements board, creative direction, aspect ratio |
| **Output** | Product showcase video with start/end frames per scene |
| **Primary Deliverable** | MP4 video file |
| **Engine Modules** | Asset Analyzer, Creative Director Agent, Plan Review Gate, Revision Agent, SEALCaM, Core Elements Board, Music Engine (optional), Assembly Engine, Re-entry Controller (reference pattern), Provider & Tier Routing |
| **Doc** | `pipelines/PRODUCT_VIDEOGRAPHY_PIPELINE.md` |

### F4 — Social Content Batch

| Field | Value |
|-------|-------|
| **Input** | Topic, keywords (optional), link (optional) |
| **Output** | Platform-optimized posts for 7 platforms + generated image(s) |
| **Primary Deliverable** | JSON with per-platform content + image URLs |
| **Engine Modules** | Creative Director Agent, Plan Review Gate, Revision Agent, Hook Library, Core Elements Board, Re-entry Controller, Template-Driven Image Composer, Brand Voice DNA, Provider & Tier Routing |
| **Doc** | `pipelines/SOCIAL_CONTENT_PIPELINE.md` |

### F5 — Cinematic Ad

| Field | Value |
|-------|-------|
| **Input** | Creative direction, core image, core elements board, aspect ratio, voice ID |
| **Output** | Full cinematic ad with synced video, music, and voiceover |
| **Primary Deliverable** | MP4 video file |
| **Engine Modules** | Asset Analyzer, Creative Director Agent, Plan Review Gate, Revision Agent, SEALCaM, Core Elements Board, Hook Library, Music Engine, Assembly Engine, Re-entry Controller, Provider & Tier Routing, Character Consistency, Brand Voice DNA |
| **Doc** | `pipelines/CINEMATIC_AD_PIPELINE.md` |

### F6 — Core Elements Board

| Field | Value |
|-------|-------|
| **Input** | Wireframe template, character photo, setting photo, product photo |
| **Output** | Composite brand board image (9:16) |
| **Primary Deliverable** | PNG image file |
| **Engine Modules** | Asset Analyzer (optional), Re-entry Controller, Provider & Tier Routing |
| **Doc** | `pipelines/CORE_ELEMENTS_BOARD.md` |

### F7 — Ad Creator

| Field | Value |
|-------|-------|
| **Input** | Reference image, creative brief |
| **Output** | Single polished product ad (image + video) + caption |
| **Primary Deliverable** | MP4 video file + image + caption |
| **Engine Modules** | Asset Analyzer, Creative Director Agent (reference pattern), Plan Review Gate (reference pattern), Revision Agent (reference pattern), SEALCaM (includes F7 normalization), Core Elements Board, Hook Library, Music Engine (optional), Assembly Engine, Re-entry Controller, Provider & Tier Routing, Brand Voice DNA |
| **Doc** | `pipelines/AD_CREATOR_PIPELINE.md` |

### F8 — Creative Cloner

| Field | Value |
|-------|-------|
| **Input** | Source video URL, reference images, brand brief |
| **Output** | Recreated video preserving original cinematic structure |
| **Primary Deliverable** | MP4 video file |
| **Engine Modules** | Asset Analyzer (reference pattern), Creative Director Agent, Plan Review Gate, Revision Agent, SEALCaM (reference pattern), Core Elements Board, Hook Library, Music Engine, Assembly Engine, Re-entry Controller, Provider & Tier Routing, Character Consistency, Brand Voice DNA |
| **Doc** | `pipelines/CREATIVE_CLONER_PIPELINE.md` |

---

## Shared Contract Patterns

### Job Stage Flow (All Families)

Every family follows this abstract stage flow:
```
brief_intake → asset_analysis → planning → plan_review → [revision_loop] → generation → assembly → post_production → [localization] → delivery
```

Specific stage names vary per family but map to this pattern.

### Artifact Storage (All Families)

All generated artifacts are stored in Supabase Storage with metadata in the `artifacts` table:
```json
{
  "artifact_id": "uuid",
  "job_id": "uuid",
  "family": "F1|F2|F3|F4|F5|F6|F7|F8",
  "type": "video|image|audio|text",
  "storage_url": "https://...",
  "metadata": { "duration": 30, "aspect_ratio": "9:16", "file_size_kb": 5200 }
}
```

### Cost Tracking (All Families)

Every API call logs cost to `job_stages.cost`:
```json
{
  "provider": "kie_ai",
  "model": "veo3_fast",
  "cost_usd": 0.12,
  "tier": "draft"
}
```

---

### Delivery Output Contract (All Video Families)

Every video family produces a delivery output via Module #17:
```json
{
  "delivery": {
    "review": {
      "review_url": "string (stream-only, watermarked)",
      "expires_at": "ISO 8601",
      "watermarked": true,
      "resolution": "720p",
      "stream_only": true
    },
    "production": {
      "status": "locked | unlocked",
      "approved_at": "ISO 8601 | null",
      "exports": [{ "platform": "string", "format": "string", "aspect_ratio": "string", "resolution": "string", "download_url": "string | null" }],
      "subtitle_tracks": [{ "language": "string", "format": "srt | vtt", "url": "string" }],
      "dubbed_versions": [{ "language": "string", "audio_url": "string", "subtitle_url": "string" }],
      "thumbnails": [{ "url": "string", "timestamp_s": "number" }]
    }
  }
}
```

---

## Cross-References

| Document | Purpose |
|----------|---------|
| `ENGINE_MODULE_REGISTRY.md` | Master registry of all 17 engine modules |
| `pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` | Original audit identifying shared patterns |
| `BRANDFLOW_FEATURE_GAPS.md` | Feature expansion gaps beyond engine modules |
| `BRANDFLOW_PRICING_STRATEGY.md` | Tier-based pricing tied to pipeline costs |
| `engines/PROVIDER_ROUTING_POLICY.md` | Unified provider + tier routing engine |
| `engines/BRAND_VOICE_DNA_ENGINE.md` | Voice signature injection contract |
| `engines/CHARACTER_CONSISTENCY_ENGINE.md` | Multi-scene character consistency |
| `engines/DELIVERY_POST_PRODUCTION_ENGINE.md` | Post-production finishing + review-safe delivery |
| `pipelines/SEALCAM_FRAMEWORK.md` | Structured prompting (includes F7 normalization) |
