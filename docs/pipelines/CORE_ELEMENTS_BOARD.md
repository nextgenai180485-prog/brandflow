# Core Elements Board Pipeline — Technical Reference

> Reverse-engineered from production prompt document: `Core Elements Board prompt`

---

## Overview

An asset preparation pipeline that generates a **brand board composite image** combining character, setting, and product into a structured visual reference. Uses a wireframe template as a layout guide and composites all elements using WaveSpeed/Kie AI's nano-banana-pro model.

**Core principle**: Create a single, structured visual reference board that feeds into downstream pipelines (Cinematic Ad, Product Videography) as the `Core Elements` input.

---

## Pipeline Stages

```text
Upload Assets (wireframe, character, setting, product)
  → Compose Prompt (structured template)
  → Generate Board (nano-banana-pro)
  → Store Artifact
```

---

## Stage 1: Asset Upload

**Inputs** (4 images uploaded in specific order):

| Slot | Image | Purpose | Example |
|------|-------|---------|---------|
| Image 1 | Wireframe Template | Layout structure (9:16 brand board grid) | Pre-designed grid with labeled sections |
| Image 2 | Character Photo | Person/model to feature | Headshot or full-body photo |
| Image 3 | Setting Photo | Environment/location | Interior, exterior, studio |
| Image 4 | Product Photo | Product to showcase | Product packaging, bottle, etc. |

**Image order matters** — the prompt references images by number (Image 1-4).

---

## Stage 2: Prompt Composition

**Purpose**: A fixed, detailed prompt instructs nano-banana-pro to composite all 4 inputs into a structured brand board.

**Full Prompt**:
```
Create a Brand board based on the layout structure provided in Image 1.
The final image should be a portrait 9:16 aspect ratio.

CHARACTER Section:
  Main Image: Fill the large "Main character image" box with a high-quality,
    detailed portrait of the subject from Image 2.
  Wireframe Replacement: Replace the two wireframe head placeholders with
    close-up headshots — front view (left) and side profile (right).
  Pose Variations: Fill the two rectangular boxes with distinct views.
    Maintain visual consistency with Image 2 but vary pose and expressions.

SETTING Section:
  Main Image: Fill the large "Main setting image" box with the environment
    from Image 3.
  Imaginative Variations: Fill the two smaller boxes with radically DIFFERENT
    architectural/spatial perspectives that expand on Image 3.
    Different view 1 ≠ Main ≠ Different view 2.

PRODUCT Section:
  Accuracy Requirement: Extreme high fidelity — exact materials, textures,
    finishes, design details. Photorealistic lighting.
  Main Image: Clear, attractive main view of the item from Image 4.
  Detailed Variations: Two distinct alternative angles including at least
    one extreme macro close-up.
    Different view 1 ≠ Main ≠ Different view 2.
```

---

## Stage 3: Board Generation

**Purpose**: Generate the composite brand board image.

**Provider**: Kie AI nano-banana-pro (or WaveSpeed nano-banana-pro)

**Kie AI endpoint**: `https://kie.ai/nano-banana?model=nano-banana-pro`

**WaveSpeed endpoint**: `https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit`

**Request** (WaveSpeed API):
```json
POST https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit
{
  "aspect_ratio": "9:16",
  "enable_base64_output": false,
  "enable_sync_mode": true,
  "output_format": "png",
  "prompt": "<full prompt above>",
  "resolution": "2k",
  "images": [
    "<wireframe_template_url>",
    "<character_photo_url>",
    "<setting_photo_url>",
    "<product_photo_url>"
  ]
}
```

**Authentication**: API key via HTTP header

**Response** (sync mode): `data.outputs[0]` contains the generated board URL.

---

## Stage 4: Store Artifact

**Purpose**: Save the generated board image for use as `Core Elements` input in downstream pipelines.

**Brandflow**: Upload to Supabase Storage, create artifact record linked to the brand/project.

---

## Provider Summary

| Stage | Provider | API Endpoint | Auth |
|-------|----------|-------------|------|
| Board Generation | WaveSpeed AI / Kie AI | `api.wavespeed.ai/api/v3/google/nano-banana-pro/edit` | HTTP header |
| Storage | Supabase Storage | Supabase SDK | Service role |

---

## Board Layout Structure

The wireframe template defines a 9:16 grid with these sections:

```
┌─────────────────────────────────┐
│         CHARACTER               │
│  ┌──────────┐ ┌─────┐ ┌─────┐  │
│  │  Main     │ │Head │ │Head │  │
│  │  Character│ │Front│ │Side │  │
│  │  Image    │ └─────┘ └─────┘  │
│  │           │ ┌─────┐ ┌─────┐  │
│  │           │ │Pose │ │Pose │  │
│  └──────────┘ │  1   │ │  2  │  │
│               └─────┘ └─────┘  │
├─────────────────────────────────┤
│         SETTING                 │
│  ┌──────────┐ ┌─────┐          │
│  │  Main     │ │View │          │
│  │  Setting  │ │  1  │          │
│  │  Image    │ ├─────┤          │
│  │           │ │View │          │
│  └──────────┘ │  2  │          │
│               └─────┘          │
├─────────────────────────────────┤
│         PRODUCT                 │
│  ┌──────────┐ ┌─────┐          │
│  │  Main     │ │View │          │
│  │  Product  │ │  1  │          │
│  │  Image    │ ├─────┤          │
│  │           │ │View │          │
│  └──────────┘ │  2  │          │
│               └─────┘          │
└─────────────────────────────────┘
```

---

## Key Design Notes

1. **This is a prerequisite pipeline** — its output feeds into Cinematic Ad (Family 5) and Product Videography (Family 3) as the `Core Elements` image
2. **No AI agent needed** — the prompt is a fixed template, not dynamically generated
3. **Image order is critical** — the prompt references Image 1-4 by number; wrong order = wrong output
4. **Nano-banana-pro is the only model** that can composite 4 input images with layout awareness
5. **The wireframe template is a reusable asset** — stored as a system-level template, not per-brand
6. **Diversity in variations** is explicitly required — each sub-image must be visually distinct from the others
7. **Product fidelity is paramount** — "extreme high fidelity" with exact materials, textures, finishes

---

## Brandflow Implementation Notes

1. **Simple pipeline** — single API call with fixed prompt, minimal orchestration needed
2. **Template management**: Store wireframe templates in Supabase Storage as system assets; allow custom templates later
3. **Input validation**: Ensure exactly 4 images are provided in the correct order before submission
4. **Preview/regenerate**: Since this is fast (~30-60 seconds), offer instant regeneration if the result is unsatisfactory
5. **Auto-trigger downstream**: After board generation, offer to automatically create a Cinematic Ad or Product Videography job using the new board
6. **Brand asset storage**: The generated board should be stored as a brand-level asset, reusable across multiple generation jobs

---

## Enterprise Engine Integration

> Applied from Cross-Family Engine Audit — elevates Core Elements Board from standalone pipeline to brand onboarding prerequisite.

### 1. Brand Onboarding Prerequisite

- **Auto-generate during brand setup**: When a user completes brand onboarding (uploads logo, product photos, selects industry), auto-trigger Core Elements Board generation
- No manual trigger needed — the system proactively creates the brand board
- Store as a permanent brand-level asset accessible by ALL families (F1–F8)
- Regenerate on demand if brand assets change

### 2. Asset Analyzer (optional pre-step)

- Add `AnalyzeAsset` (mode: `composite`) as an optional pre-step
- Generates a text description of the uploaded assets before board generation
- Useful for logging and for families that need text-based brand context without the visual board

### 3. Re-entry Controller

- Simple pipeline (single API call) — re-entry is basic retry logic
- If generation fails → auto-retry up to 3 times with 30s delay
- If all retries fail → notify user, offer manual retry button
- No complex stage-based resume needed (single-step pipeline)

### 4. No Approval Gate Needed

- Fast generation (~30-60 seconds)
- Easy to regenerate if unsatisfactory
- Offer "Regenerate" button instead of approve/reject flow
- Show preview immediately after generation — user can regenerate or accept

### 5. Cross-Family Distribution

After generation, the board is automatically available to:
- **F1 UGC**: Product placement reference
- **F2 AI Spokesperson**: Avatar setting context
- **F3 Product Videography**: `Core Elements` input (already connected)
- **F5 Cinematic Ad**: `Core Elements` input (already connected)
- **F7 Ad Creator**: Creative Director reference
- **F8 Creative Cloner**: Brand context for prompt generation
- **Image Template Engine**: Brand style reference for Seedream fusion

### 6. Template Management

- Store wireframe templates in Supabase Storage as system-level assets
- Default template: standard 9:16 grid (CHARACTER / SETTING / PRODUCT)
- Future: Allow custom templates per brand or per industry
- Template versioning: track which template version was used for each board

### 7. Core Elements Board V2

Upgrade to V2 with named slots and partial regeneration:
- **Named slots**: Replace order-dependent image upload with named drop zones (`wireframe`, `character`, `environment`, `product`)
- **Preview overlays**: Color-coded wireframe overlay showing where each upload maps to on the board
- **Partial regeneration**: Use SeedEdit 3.0 to selectively regenerate individual sections (`character_only`, `product_only`, `environment_only`, `layout_only`)
- Cost: ~$0.02-0.05 per partial regeneration vs ~$0.10 for full board
- See `engines/CORE_ELEMENTS_BOARD_V2.md` for full V2 spec

### 8. Provider Routing

All provider calls route through the Provider Routing Layer:
- Image: WaveSpeed nano-banana-pro → Kie AI nano-banana-pro (fallback chain)
- See `engines/PROVIDER_ROUTING_POLICY.md` for health-check and failover logic
