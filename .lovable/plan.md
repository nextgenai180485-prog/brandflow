

## Analysis: Template-Based Image Recreation Using Seedream 5.0 Lite + SeedEdit 3.0

### The Idea

Store pre-designed marketing templates (social posts, ad creatives, product posters) in the database with their prompts and metadata. Users select a template, supply their product image + text, and the system generates a new image that follows the template's layout and style but with the user's brand assets swapped in.

### Is It Possible? Yes -- Two Complementary Approaches

**Approach A -- Seedream 5.0 Lite (Multi-Image Fusion)**

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

**Approach B -- SeedEdit 3.0 (Targeted Edit)**

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

### Recommended Strategy: Use Both

| Use Case | Model | Why |
|----------|-------|-----|
| Social media posts (product + text + layout) | Seedream 5.0 Lite | Multi-image fusion handles product + logo + template reference |
| Ad creatives with specific product placement | Seedream 5.0 Lite | Can composite product photo into template scene |
| Quick text/color/mood changes on existing ads | SeedEdit 3.0 | Precise targeted edits without regenerating everything |
| Template variations (same template, different style) | SeedEdit 3.0 | "Make this warmer" / "Change to night scene" |

### How It Fits Into Brandflow

This becomes a new pipeline family or an enhancement to the Social Content pipeline:

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
│ Merge template.prompt with   │  Template prompt + brand assets
│ user's product images, logo, │  + user text = final prompt
│ headline text, brand colors  │
└──────────┬───────────────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
  SEEDREAM      SEEDEDIT         ← Router picks model
  5.0 Lite      3.0              based on template type
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

### Database Schema: `image_templates`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `title` | text | "Minimal Product Poster", "Instagram Story Sale" |
| `template_image_url` | text | Supabase Storage path to the template reference image |
| `base_prompt` | text | The generation prompt with `{{product}}`, `{{headline}}`, `{{brand_color}}` placeholders |
| `model_type` | enum | `seedream` or `seededit` -- which model to use |
| `category` | text | `social_post`, `ad_creative`, `product_poster`, `story`, `banner` |
| `industry_tags` | text[] | `{fashion, food, tech, beauty}` |
| `style_tags` | text[] | `{minimal, bold, luxury, playful}` |
| `platform_fit` | text[] | `{instagram_feed, instagram_story, facebook, linkedin, tiktok}` |
| `aspect_ratio` | text | `1:1`, `9:16`, `16:9`, `4:5` |
| `input_slots` | jsonb | What the user needs to provide: `{product_image: true, logo: true, headline: true, subtext: false}` |
| `quality_score` | float | Internal rating |
| `is_active` | boolean | Enable/disable |

### Key Technical Considerations

1. **Provider routing**: BytePlus ModelArk is the cheapest direct source ($0.035/image for Seedream). WaveSpeed also hosts both models. We should add BytePlus as a provider option alongside Kie AI.

2. **Text rendering**: Seedream 5.0 Lite has improved text rendering but it is not pixel-perfect for exact typography. For templates with critical text (prices, phone numbers), consider a two-pass approach: generate the image without text via AI, then overlay text programmatically using a canvas/image processing step.

3. **Brand consistency**: Seedream's multi-image fusion with `image_urls` is ideal -- pass the user's product photo + logo + brand style guide image as references, and the model maintains visual consistency.

4. **Speed**: Seedream 5.0 Lite generates in ~10-30 seconds. SeedEdit 3.0 is similarly fast. This is much faster than video pipelines -- users could get near-instant results.

5. **Volume play**: At $0.035/image, generating 3 variants per template costs ~$0.10. This is extremely cost-effective for a "generate 10 social posts" batch operation.

### What This Unlocks

This is essentially a **Canva-killer feature** but zero-effort: instead of dragging and dropping elements onto a template, users just pick a template and hit generate. The AI handles all the compositing, style matching, and brand alignment automatically.

Combined with the Social Content pipeline (which already generates captions), you get a full content package: AI-generated image + platform-optimized caption, ready to post.

### Next Steps (When Ready to Build)

1. Design the `image_templates` table and seed it with initial templates
2. Add BytePlus ModelArk as a provider in the provider abstraction layer
3. Build the template gallery UI (categorized, filterable, with previews)
4. Create the Edge Function that assembles prompts from template + brand assets
5. Integrate with the Social Content pipeline for image + caption bundles

