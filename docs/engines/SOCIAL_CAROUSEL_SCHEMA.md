# Social Carousel Schema & Template-Driven Image Composer — Technical Reference

> **Status**: Design reference — not yet implemented  
> **Owner**: F4 Social Content + Image Template Engine  
> **Purpose**: Replace generic AI-generated images with template-driven, brand-consistent visuals including carousel support

---

## Overview

F4 Social Content currently generates images from caption text via DALL-E/Seedream — producing generic, "AI-ish" visuals. This engine replaces that with a `TemplateDrivenImageComposer` that uses pre-designed composition templates, brand palettes, and product anchors to produce platform-optimized images including multi-slide carousels.

---

## TemplateDrivenImageComposer

### Inputs

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `brand_palette` | object | Yes | `{ primary: "#FF6B35", secondary: "#004E89", accent: "#F77F00" }` |
| `composition_template` | string | Yes | `product_spotlight_centered` |
| `product_anchor` | URL | Yes | Product image URL from brand assets |
| `layout_style` | enum | Yes | `minimal` \| `editorial` \| `bold` \| `lifestyle` |
| `platform_type` | enum | Yes | `instagram_post` \| `instagram_story` \| `linkedin_post` \| `facebook_post` |
| `headline` | string | No | "3 Tips for Better Skin" |
| `body_text` | string | No | Short supporting text |
| `cta_text` | string | No | "Shop Now" |

### Output

```json
{
  "image_url": "https://storage.../generated_image.png",
  "dimensions": { "width": 1080, "height": 1080 },
  "platform": "instagram_post",
  "template_used": "product_spotlight_centered"
}
```

### Generation Pipeline

```text
1. Select composition template by platform + layout_style
2. Inject brand_palette into template color slots
3. Generate base scene with Seedream 5.0 Lite (template prompt + brand context)
4. Fuse product_anchor into scene via SeedEdit 3.0 (product placement)
5. Overlay text elements (headline, body, CTA) if provided
6. Export at platform-optimized dimensions
```

See `IMAGE_TEMPLATE_ENGINE_DESIGN.md` for Seedream 5.0 Lite + SeedEdit 3.0 fusion details.

---

## Carousel Slide Schema

### Instagram Carousel

```json
{
  "platform": "instagram",
  "format": "carousel",
  "aspect_ratio": "1:1",
  "max_slides": 10,
  "slides": [
    {
      "slide_number": 1,
      "type": "cover",
      "image_url": "https://...",
      "headline": "5 Skincare Mistakes You're Making",
      "body": null,
      "cta": null
    },
    {
      "slide_number": 2,
      "type": "content",
      "image_url": "https://...",
      "headline": "Mistake #1",
      "body": "Not wearing sunscreen daily...",
      "cta": null
    },
    {
      "slide_number": 5,
      "type": "cta",
      "image_url": "https://...",
      "headline": "Ready to fix your routine?",
      "body": null,
      "cta": "Link in bio 👆"
    }
  ]
}
```

### LinkedIn Carousel (Document Post)

```json
{
  "platform": "linkedin",
  "format": "carousel",
  "aspect_ratio": "1:1",
  "max_slides": 20,
  "document_format": "pdf",
  "slides": [
    {
      "slide_number": 1,
      "type": "cover",
      "headline": "The State of AI Marketing in 2026",
      "subtitle": "5 trends every marketer should know"
    }
  ]
}
```

---

## Platform Dimension Specs

| Platform | Format | Aspect Ratio | Dimensions (px) |
|----------|--------|-------------|-----------------|
| Instagram Post | Single | 1:1 | 1080 × 1080 |
| Instagram Story | Single | 9:16 | 1080 × 1920 |
| Instagram Carousel | Multi | 1:1 | 1080 × 1080 per slide |
| LinkedIn Post | Single | 1.91:1 | 1200 × 627 |
| LinkedIn Carousel | Multi (PDF) | 1:1 | 1080 × 1080 per page |
| Facebook Post | Single | 1.91:1 | 1200 × 630 |
| Twitter/X | Single | 16:9 | 1200 × 675 |

---

## F4 Social Content Integration

### New Stage 2B: Template-Driven Image Generation

Replaces the existing Stage 3 (generic DALL-E/Seedream image generation):

1. AI Agent (Stage 2) generates `image_suggestion` per platform
2. **NEW**: Map `image_suggestion` to a composition template from the template library
3. **NEW**: Generate image using `TemplateDrivenImageComposer` with brand assets
4. **NEW**: For carousel-eligible platforms (Instagram, LinkedIn), generate multi-slide output
5. Upload to Supabase Storage (replaces imgbb)

### Updated Output Schema (F4)

```json
{
  "platform_posts": {
    "Instagram": {
      "format": "carousel",
      "slides": [...],
      "caption": "...",
      "hashtags": [...]
    },
    "LinkedIn": {
      "format": "single",
      "image_url": "...",
      "post": "...",
      "hashtags": [...]
    }
  }
}
```

---

## Key Design Notes

1. **Template selection is automated** — the AI Agent's `image_suggestion` is mapped to the best-matching template
2. **Brand palette is mandatory** — no image generation without brand colors loaded
3. **Carousel is opt-in** — user can choose single image or carousel per platform in brief settings
4. **Text overlay uses brand fonts** — stored in brand assets, applied during export step
5. **Product anchor is optional** — some posts (thought leadership, tips) don't feature a product
