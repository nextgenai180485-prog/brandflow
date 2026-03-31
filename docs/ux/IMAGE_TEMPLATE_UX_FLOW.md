# F9 Image Template Engine — Full UX Flow Specification

> **Status**: Design reference — not yet implemented  
> **Owner**: F9 Image Template Engine + Module #14 TemplateDrivenImageComposer  
> **Model**: SeedEdit 3.0 only — all generation is edit-based, never from-scratch  
> **Last updated**: 2026-03-31

---

## Architecture Decision: Why SeedEdit Only

Seedream 5.0 Lite generates images from scratch using multi-image fusion. **We don't use it for F9.**

Why:
1. **Templates ARE the design** — we already have the finished layout as a high-quality reference image
2. **Users swap elements INTO a template** — that's an edit operation, not a generation operation
3. **SeedEdit 3.0 preserves layout fidelity** — it keeps the composition, lighting, spacing, and style intact while surgically replacing only the targeted elements
4. **Seedream would re-imagine the layout** — fusion produces a "inspired by" result, not a faithful template reproduction
5. **Cost** — SeedEdit at ~$0.03/edit is cheaper than Seedream at $0.035/generation
6. **Consistency** — same template, same layout, every time. SeedEdit guarantees this. Seedream does not.

**One model, one mental model**: Template in → branded template out.

---

## Screen-by-Screen Flow

### Screen 1: Campaign Context

**What the user sees:**
- "What are you creating for?" — theme selector
- Quick picks: `Valentine's Day`, `Summer Sale`, `New Arrival`, `Holiday`, `Custom`
- Platform selector: `Instagram Post`, `Instagram Story`, `Facebook`, `LinkedIn`, `TikTok`
- Optional: date/deadline picker for scheduling context

**What fires:**
| Engine Module | Action |
|---------------|--------|
| #12 Brand Voice DNA | Loads user's brand_palette, logos, product photos from Brand Kit |
| #21 Strategy Engine | If campaign context provided, filters templates by relevance |

**Data passed to next screen:**
```json
{
  "campaign_theme": "valentines",
  "platforms": ["instagram_post", "instagram_story"],
  "brand_kit": {
    "primary_color": "#FF6B35",
    "secondary_color": "#004E89",
    "accent_color": "#F77F00",
    "logo_url": "https://storage.../logo.png",
    "product_images": ["https://storage.../product_1.png", "https://storage.../product_2.png"],
    "brand_fonts": { "headline": "Playfair Display", "body": "Inter" }
  }
}
```

---

### Screen 2: Template Gallery

**What the user sees:**
- Grid of template preview cards, filtered by campaign theme + platform
- Each card shows the **original template image** (NOT the user's branded version yet)
- Filter chips: `Product Showcase`, `Testimonial`, `Quote Card`, `Sale/Promo`, `Before & After`, `Lifestyle`
- Style chips: `Minimal`, `Bold`, `Luxury`, `Playful`
- Badge on each card: platform fit icon (IG, FB, etc.)
- "Recommended for you" row at top — Strategy Engine picks based on brand profile + past performance

**What fires:**
| Engine Module | Action |
|---------------|--------|
| #14 Template-Driven Image Composer | Queries `image_templates` table filtered by theme, platform, category |
| #22 Performance Feedback Engine | Sorts templates by `quality_score` weighted by user's industry performance data |
| #11 Hook Library | Suggests headline/CTA text patterns that perform well for this category |

**Data passed to next screen:**
```json
{
  "selected_template": {
    "id": "tpl_val_001",
    "title": "Valentine Hearts Product Spotlight",
    "template_image_url": "https://storage.../templates/val_hearts_001.png",
    "base_prompt": "Replace the product in the center with {{product_description}}. Change the headline to '{{headline}}'. Adjust the accent colors to {{brand_color}}. Keep the heart decorations, layout, and lighting identical.",
    "input_slots": {
      "product_image": true,
      "headline": true,
      "subtext": true,
      "logo": true,
      "accent_color": true
    },
    "aspect_ratio": "1:1",
    "category": "product_spotlight",
    "platform_fit": ["instagram_post"]
  }
}
```

---

### Screen 3: Asset Customization Panel

**What the user sees:**
A split-screen layout:
- **Left**: Live template preview (original template image initially)
- **Right**: Customization form with ONLY the fields defined by `input_slots`

**Customization fields (conditional on template):**

| Slot | UI Element | Default Value | Source |
|------|------------|---------------|--------|
| `product_image` | Drag-drop zone / picker from Brand Kit gallery | User's first product photo | Brand Kit |
| `headline` | Text input (character limit from template) | Hook Library suggestion | #11 Hook Library |
| `subtext` | Text input | Empty | User input |
| `logo` | Toggle on/off + position picker (TL/TR/BL/BR) | On, position from template | Brand Kit |
| `accent_color` | Color picker, pre-filled with brand palette | `brand_palette.accent` | #12 Brand Voice DNA |
| `background_mood` | Dropdown: `Keep Original`, `Warmer`, `Cooler`, `Darker`, `Lighter` | Keep Original | User choice |

**Key UX principle**: Only show slots that the selected template supports. A quote card template won't show `product_image`. A product showcase won't show `background_mood`.

**What fires (on field change — debounced, NOT live preview):**
Nothing yet — no API calls until user clicks Generate.

**Data passed to next screen:**
```json
{
  "template_id": "tpl_val_001",
  "template_image_url": "https://storage.../templates/val_hearts_001.png",
  "customizations": {
    "product_image_url": "https://storage.../user/product_perfume.png",
    "product_description": "a sleek black perfume bottle with gold cap",
    "headline": "Love Your Scent",
    "subtext": "Limited Valentine's Edition",
    "logo_url": "https://storage.../user/logo.png",
    "logo_position": "top-left",
    "accent_color": "#FF6B35",
    "background_mood": "warmer"
  },
  "platform": "instagram_post",
  "aspect_ratio": "1:1"
}
```

---

### Screen 4: Generation (Loading State)

**What the user sees:**
- Template preview with a shimmer/progress overlay
- "Creating your design..." with estimated time (10-20 seconds)
- Fun micro-copy: "Swapping your product in...", "Applying your brand colors...", "Almost done..."

**What fires — this is the core pipeline:**

```text
STEP 1 — PROMPT ASSEMBLY (Edge Function, ~200ms)
├── Load template.base_prompt
├── Replace {{placeholders}} with user customizations
├── Append product_description (from Asset Analyzer if not manually provided)
├── Append mood modifier if background_mood ≠ "Keep Original"
└── Final prompt ready

STEP 2 — SEEDEDIT 3.0 CALL (~10-20 seconds)
├── INPUT: template_image_url (the original template)
├── INPUT: assembled prompt (surgical edit instructions)
├── Provider: BytePlus ModelArk (primary) → WaveSpeed (fallback)
├── OUTPUT: edited_image_base64 or edited_image_url
└── Cost: ~$0.03

STEP 3 — TEXT OVERLAY (Edge Function, ~500ms)
├── If headline/subtext provided:
│   ├── Render text using brand fonts (Sharp/Canvas)
│   ├── Position per template's text_zones metadata
│   ├── Apply brand colors to text
│   └── Composite onto SeedEdit output
├── If logo enabled:
│   ├── Place logo at specified position
│   └── Scale to template's logo_zone dimensions
└── OUTPUT: final_image with pixel-perfect typography

STEP 4 — UPLOAD + RECORD (~300ms)
├── Upload final_image to Supabase Storage
├── Create `generated_images` record
└── Emit touchpoint_event: image_generated
```

**Engine modules involved:**

| Engine Module | Role in this step |
|---------------|-------------------|
| #14 Template-Driven Image Composer | Orchestrates the full pipeline (Steps 1-4) |
| #4 Asset Analyzer | Generates `product_description` from product photo if user didn't type one |
| #9 Unified Routing Engine | Picks SeedEdit provider (BytePlus → WaveSpeed fallback) |
| #12 Brand Voice DNA | Supplies brand_palette, fonts, logo for text overlay step |
| #11 Hook Library | Provided headline suggestions earlier (Screen 3) |
| #17 Delivery & Post-Production | Handles final export dimensions per platform |

**Data passed to next screen:**
```json
{
  "job_id": "img_job_abc123",
  "result_image_url": "https://storage.../generated/img_abc123.png",
  "template_id": "tpl_val_001",
  "cost": 0.03,
  "generation_time_ms": 14200,
  "platform": "instagram_post",
  "dimensions": { "width": 1080, "height": 1080 }
}
```

---

### Screen 5: Review & Refine

**What the user sees:**
- Large preview of the generated image
- Side-by-side toggle: "Original Template" ↔ "Your Version"
- Action buttons:
  - ✅ **Approve** — saves to content library
  - 🔄 **Regenerate** — same inputs, new SeedEdit run (slight variation)
  - ✏️ **Adjust** — returns to Screen 3 with current customizations pre-filled
  - 🎨 **Quick Swap** — inline mini-panel for fast single-element changes:
    - "Swap product" (re-runs SeedEdit with new product instruction)
    - "Change headline" (re-runs text overlay only — FREE, no SeedEdit cost)
    - "Adjust colors" (re-runs SeedEdit with color instruction)

**What fires:**

| Action | Engine Module | Cost |
|--------|---------------|------|
| Approve | #19 Review Packet Engine — creates approval record | $0.00 |
| Regenerate | #14 Image Composer → SeedEdit 3.0 | ~$0.03 |
| Quick Swap (product/colors) | #14 Image Composer → SeedEdit 3.0 | ~$0.03 |
| Quick Swap (text only) | #17 Delivery Engine — text overlay only | $0.00 |

**Key insight**: Text-only changes (headline, subtext, CTA) use the programmatic overlay and cost nothing. Only product/color/mood swaps hit SeedEdit.

**Data on Approve:**
```json
{
  "approval": {
    "job_id": "img_job_abc123",
    "status": "approved",
    "approved_by": "user_uuid",
    "approved_at": "2026-02-14T10:30:00Z",
    "final_image_url": "https://storage.../generated/img_abc123.png",
    "destination": "content_library"
  }
}
```

---

### Screen 6: Batch Mode (Multi-Template Generation)

**What the user sees:**
- After approving one image, prompt: "Generate for other platforms too?"
- Checklist of remaining platforms from Screen 1 selection
- "Generate All" button — runs the same customizations against platform-appropriate templates

**What fires:**

```text
FOR EACH remaining platform:
  1. #14 Image Composer selects best template for that platform + same theme
  2. Adapts aspect_ratio (1:1 → 9:16 for Stories, 1.91:1 for LinkedIn)
  3. Runs SeedEdit 3.0 with same product/headline/colors
  4. Text overlay with platform-specific dimensions
  5. Upload + record

All platform variants run IN PARALLEL
```

**Engine modules:**
| Module | Role |
|--------|------|
| #14 Template-Driven Image Composer | Orchestrates parallel batch |
| #9 Unified Routing Engine | Load-balances across provider pool |
| #17 Delivery Engine | Platform-specific export dimensions |
| #22 Performance Feedback Engine | Records which templates were used for future scoring |

**Batch output:**
```json
{
  "batch_id": "batch_val_001",
  "results": [
    { "platform": "instagram_post", "image_url": "...", "dimensions": "1080x1080" },
    { "platform": "instagram_story", "image_url": "...", "dimensions": "1080x1920" },
    { "platform": "facebook_post", "image_url": "...", "dimensions": "1200x630" }
  ],
  "total_cost": 0.09,
  "total_time_ms": 18000
}
```

---

## Touchpoint Events Emitted (Full Trace)

| Screen | Event | Key Data |
|--------|-------|----------|
| 1 | `campaign.context_set` | theme, platforms, brand_kit_id |
| 2 | `template.browsed` | filters_applied, templates_viewed_count |
| 2 | `template.selected` | template_id, category, was_recommended |
| 3 | `customization.completed` | slots_filled, time_spent_ms |
| 4 | `image.generation_started` | template_id, provider, model |
| 4 | `image.seededit_completed` | provider, latency_ms, cost |
| 4 | `image.text_overlay_applied` | has_headline, has_logo, font_used |
| 4 | `image.generation_completed` | job_id, total_latency_ms, total_cost |
| 5 | `image.reviewed` | action: approve/regenerate/adjust/quick_swap |
| 5 | `image.approved` | job_id, final_image_url |
| 6 | `batch.started` | platform_count, template_ids |
| 6 | `batch.completed` | total_images, total_cost, total_time_ms |

---

## Cost Model Per User Action

| User Action | SeedEdit Calls | Text Overlay | Total Cost |
|-------------|---------------|--------------|------------|
| Generate 1 image | 1 | 1 | ~$0.03 |
| Regenerate (retry) | 1 | 1 | ~$0.03 |
| Quick Swap (product/color) | 1 | 1 | ~$0.03 |
| Quick Swap (text only) | 0 | 1 | $0.00 |
| Batch 3 platforms | 3 | 3 | ~$0.09 |
| Full Valentine's campaign (10 images) | 10 | 10 | ~$0.30 |

**Zero double-charging**: SeedEdit runs once per visual change. Text overlay is always free. No Seedream call exists in this pipeline.

---

## Module Dependency Map

```text
Screen 1 ──→ #12 Brand Voice DNA (load kit)
         ──→ #21 Strategy Engine (campaign context)

Screen 2 ──→ #14 Template-Driven Image Composer (query templates)
         ──→ #22 Performance Feedback Engine (sort by score)
         ──→ #11 Hook Library (suggest headlines)

Screen 3 ──→ (No modules — pure UI, user fills form)

Screen 4 ──→ #14 Image Composer (orchestrate)
         ──→ #4 Asset Analyzer (product description)
         ──→ #9 Unified Routing Engine (provider selection)
         ──→ #12 Brand Voice DNA (fonts/colors for overlay)
         ──→ #17 Delivery Engine (export dimensions)

Screen 5 ──→ #19 Review Packet Engine (approval record)
         ──→ #14 Image Composer (regenerate/swap)
         ──→ #17 Delivery Engine (text-only re-overlay)

Screen 6 ──→ #14 Image Composer (batch orchestration)
         ──→ #9 Unified Routing Engine (parallel provider routing)
         ──→ #22 Performance Feedback Engine (usage tracking)
```

---

## What Seedream 5.0 Lite Would Be Used For (NOT F9)

For clarity — Seedream 5.0 Lite is not dead in the system. It lives in:
- **F6 Core Elements Board** — generating brand mood boards from scratch (no template to edit)
- **F4 Social Content** — when no template is selected and the system needs to generate a completely new image from a caption prompt

But in F9 Image Template Engine, the template IS the image. We edit it. SeedEdit only.
