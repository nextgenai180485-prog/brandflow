# Image Template Engine — Design Document

> Template-based image recreation using Seedream 5.0 Lite + SeedEdit 3.0

---

## 1. Vision

Store pre-designed marketing templates (social posts, ad creatives, product posters) in the database with their prompts and metadata. Users select a template, supply their product image + text, and the system generates a new image that follows the template's layout and style but with the user's brand assets swapped in.

Zero-effort Canva alternative: users pick a template and hit generate. AI handles compositing, style matching, and brand alignment automatically.

---

## 2. Two Complementary Approaches

### Approach A — Seedream 5.0 Lite (Multi-Image Fusion)

Best for: generating new images from template references + user assets.

- Accepts up to 14 reference images via `image_urls`
- You provide: template reference image + user's product photo + user's logo
- Prompt instructs the model to follow the template layout but use the user's product/branding
- $0.035/image via BytePlus ModelArk
- Available via BytePlus ModelArk direct API, Replicate, AIML API, WaveSpeed

```text
INPUTS:
  image_urls: [template_image, product_photo, logo]
  prompt: "Create a social media ad following the layout of image 1.
           Feature the product from image 2 as the hero element.
           Use the brand logo from image 3 in the top-left corner.
           Headline: 'Summer Collection 2026'. Clean, modern aesthetic."

OUTPUT: New image matching template layout with user's assets
```

### Approach B — SeedEdit 3.0 (Targeted Edit)

Best for: precise edits to an existing template image (swap product, change text).

- Takes one input image + text instruction
- "Replace the product in this image with [description]" or "Change the headline to X"
- Better for templates where the layout is fixed and you only need to swap specific elements
- Available via BytePlus ModelArk (`seededit-3-0-i2i-250628`), WaveSpeed, AIML API

```text
INPUT:
  image: template_image_url
  prompt: "Replace the product with a sleek black perfume bottle.
           Change the headline text to 'Noir Collection'.
           Keep the same layout, lighting, and color scheme."

OUTPUT: Edited template with swapped content
```

### When to Use Which

| Use Case | Model | Why |
|----------|-------|-----|
| Social media posts (product + text + layout) | Seedream 5.0 Lite | Multi-image fusion handles product + logo + template reference |
| Ad creatives with specific product placement | Seedream 5.0 Lite | Can composite product photo into template scene |
| Quick text/color/mood changes on existing ads | SeedEdit 3.0 | Precise targeted edits without regenerating everything |
| Template variations (same template, different style) | SeedEdit 3.0 | "Make this warmer" / "Change to night scene" |

---

## 3. Pipeline Flow

```text
USER SELECTS TEMPLATE → SYSTEM INJECTS BRAND ASSETS
        │
        ▼
┌──────────────────────────────┐
│ STAGE 0 — TEMPLATE SELECT    │
│ User picks from categorized  │
│ template gallery (or AI      │
│ auto-selects based on brief) │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ STAGE 1 — PROMPT ASSEMBLY    │  Edge Function
│ Merge template.base_prompt   │  Template prompt + brand assets
│ with user's product images,  │  + user text = final prompt
│ logo, headline, brand colors │
└──────────┬───────────────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
  SEEDREAM      SEEDEDIT         ← Router picks model
  5.0 Lite      3.0              based on template.model_type
  (new image)   (edit image)
     │            │
     └─────┬──────┘
           ▼
┌──────────────────────────────┐
│ STAGE 2 — REVIEW + VARIANTS  │
│ Show result, offer 2-3       │
│ variants, approve/reject     │
└──────────────────────────────┘
```

**Speed**: ~10-30 seconds per image. Near-instant compared to video pipelines.

---

## 4. Database Schema: `image_templates`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `title` | text | "Minimal Product Poster", "Instagram Story Sale" |
| `template_image_url` | text | Supabase Storage path to the template reference image |
| `base_prompt` | text | Generation prompt with `{{product}}`, `{{headline}}`, `{{brand_color}}` placeholders |
| `model_type` | enum | `seedream` or `seededit` — which model to use |
| `category` | text | `social_post`, `ad_creative`, `product_poster`, `story`, `banner` |
| `industry_tags` | text[] | `{fashion, food, tech, beauty}` |
| `style_tags` | text[] | `{minimal, bold, luxury, playful}` |
| `platform_fit` | text[] | `{instagram_feed, instagram_story, facebook, linkedin, tiktok}` |
| `aspect_ratio` | text | `1:1`, `9:16`, `16:9`, `4:5` |
| `input_slots` | jsonb | What user provides: `{product_image: true, logo: true, headline: true, subtext: false}` |
| `quality_score` | float | Internal rating (1-10) |
| `usage_count` | int | How many times used (analytics) |
| `is_active` | boolean | Enable/disable without deleting |
| `created_at` | timestamp | When added to library |

### Prompt Template Example

```text
base_prompt: "Create a {{category}} following this template's layout.
Feature {{product}} as the hero element, centered.
Brand colors: {{brand_color}}. Logo placement: top-left.
Headline: '{{headline}}'.
Style: {{style_tags}}. Clean, professional finish."
```

The Edge Function replaces `{{placeholders}}` with values from the user's Brand Kit + any custom text input.

---

## 5. Provider Summary

| Provider | Model | Cost | Use |
|----------|-------|------|-----|
| BytePlus ModelArk | Seedream 5.0 Lite | $0.035/image | Multi-image fusion (primary) |
| BytePlus ModelArk | SeedEdit 3.0 (`seededit-3-0-i2i-250628`) | ~$0.03/image | Targeted edits |
| WaveSpeed | Seedream 5.0 Lite | ~$0.04/image | Fallback provider |
| Replicate | Seedream 5.0 Lite | ~$0.04/image | Fallback provider |

**Volume economics**: 3 variants per template = ~$0.10. Generating 10 social posts = ~$0.35.

---

## 6. Key Technical Considerations

1. **Provider routing**: BytePlus ModelArk is the cheapest direct source. WaveSpeed also hosts both models. Add BytePlus as a provider option alongside Kie AI in the provider abstraction layer.

2. **Text rendering**: Seedream 5.0 Lite has improved text rendering but is not pixel-perfect for exact typography. For templates with critical text (prices, phone numbers), use a two-pass approach: generate image without text via AI, then overlay text programmatically using a canvas/image processing step (Python Pillow or Sharp).

3. **Brand consistency**: Seedream's multi-image fusion with `image_urls` is ideal — pass user's product photo + logo + brand style guide image as references, and the model maintains visual consistency.

4. **Speed**: Seedream 5.0 Lite generates in ~10-30 seconds. SeedEdit 3.0 is similarly fast. Much faster than video pipelines — users get near-instant results.

5. **Batch generation**: At $0.035/image, this is extremely cost-effective for "generate 10 social posts" batch operations. Can run in parallel for even faster throughput.

---

## 7. Integration with Other Pipelines

- **Social Content Pipeline**: This engine generates the images; Social Content Pipeline generates the captions. Together = full content package (image + platform-optimized text), ready to post.
- **Ad Creator Pipeline**: Can use image templates for the static ad variant instead of full video generation.
- **Creative Cloner Pipeline**: Shares the template library concept — video templates for video cloning, image templates for image recreation.

---

## 8. Template Curation Strategy

Same approach as video templates (see `CREATIVE_CLONER_ENGINE_DESIGN.md`):

1. Source high-quality reference ad images or create original template designs
2. Write the `base_prompt` with placeholder variables
3. Tag with industry, style, platform, category
4. Set `model_type` based on whether the template works better with fusion (seedream) or editing (seededit)
5. Quality review and scoring
6. Insert into `image_templates` table

Track `usage_count` and approval rates to identify top performers and retire low-performers.

---

## 9. Next Steps (When Ready to Build)

1. Design the `image_templates` table and seed with initial templates
2. Add BytePlus ModelArk as a provider in the provider abstraction layer
3. Build the template gallery UI (categorized, filterable, with previews)
4. Create the Edge Function that assembles prompts from template + brand assets
5. Integrate with the Social Content pipeline for image + caption bundles
