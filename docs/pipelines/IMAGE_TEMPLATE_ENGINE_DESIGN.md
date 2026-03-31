# Image Template Engine — Design Document

> Template-based image creation using SeedEdit 3.0 (targeted editing of pre-designed templates)

---

## 1. Vision

Store pre-designed marketing templates (social posts, ad creatives, product posters) in the database with their prompts and metadata. Users select a template, supply their product image + text, and **SeedEdit 3.0 surgically swaps elements** while preserving the template's layout, lighting, and composition.

Zero-effort Canva alternative: users pick a template, customize text and assets, hit generate. SeedEdit handles compositing and brand alignment automatically.

**Architecture decision**: SeedEdit 3.0 is the **sole generation model** for F9. Templates are finished designs — we edit them, we don't regenerate them. See `docs/ux/IMAGE_TEMPLATE_UX_FLOW.md` for the full rationale.

---

## 2. Generation Model — SeedEdit 3.0

### How It Works

SeedEdit 3.0 takes one input image + a text instruction and performs targeted edits while preserving everything else.

- Takes one input image (the template) + text instruction
- "Replace the product in this image with [description]" or "Change the headline to X"
- Preserves layout, lighting, color scheme, decorative elements
- Available via BytePlus ModelArk (`seededit-3-0-i2i-250628`), WaveSpeed, AIML API

```text
INPUT:
  image: template_image_url
  prompt: "Replace the product with a sleek black perfume bottle.
           Adjust the accent colors to warm coral (#FF6B35).
           Keep the same layout, lighting, and decorations."

OUTPUT: Edited template with swapped content
```

### Why Not Seedream 5.0 Lite

| Factor | SeedEdit 3.0 | Seedream 5.0 Lite |
|--------|-------------|-------------------|
| Layout fidelity | Pixel-faithful to template | "Inspired by" — reinterprets layout |
| Consistency | Same template = same layout every time | Varies per generation |
| Use case | Edit existing design | Generate from scratch |
| Cost | ~$0.03/edit | ~$0.035/generation |
| F9 fit | ✅ Perfect — templates ARE the design | ❌ Wrong tool for the job |

Seedream 5.0 Lite is used elsewhere (F6 Core Elements Board, F4 Social Content for no-template generation) but has no role in F9.

---

## 3. Pipeline Flow

```text
USER SELECTS TEMPLATE → CUSTOMIZES ASSETS → SEEDEDIT SWAPS ELEMENTS
        │
        ▼
┌──────────────────────────────┐
│ STAGE 0 — TEMPLATE SELECT    │
│ User picks from categorized  │
│ template gallery, filtered   │
│ by theme + platform          │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ STAGE 1 — ASSET CUSTOMIZATION│
│ User fills input_slots:      │
│ product photo, headline,     │
│ logo, accent colors          │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ STAGE 2 — PROMPT ASSEMBLY    │  Edge Function
│ Merge template.base_prompt   │  Template prompt + customizations
│ with user's assets + text    │  = SeedEdit instruction
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ STAGE 3 — SEEDEDIT 3.0       │  ~10-20 seconds
│ Input: template_image_url    │  Single model, single call
│ Input: assembled prompt      │  Surgical element swap
│ Output: edited image         │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ STAGE 4 — TEXT OVERLAY        │  Programmatic (Sharp/Canvas)
│ Pixel-perfect headline, CTA  │  Uses brand fonts, not AI text
│ Logo placement               │  ~500ms, $0.00 cost
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ STAGE 5 — REVIEW + VARIANTS  │
│ Approve / Regenerate / Swap  │
│ Text-only changes are FREE   │
└──────────────────────────────┘
```

**Speed**: ~10-20 seconds per image. Near-instant compared to video pipelines.

---

## 4. Database Schema: `image_templates`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `title` | text | "Minimal Product Poster", "Instagram Story Sale" |
| `template_image_url` | text | Supabase Storage path to the template reference image |
| `base_prompt` | text | SeedEdit instruction with `{{product_description}}`, `{{headline}}`, `{{brand_color}}` placeholders |
| `category` | text | `product_spotlight`, `testimonial`, `quote_card`, `sale_promo`, `before_after`, `lifestyle` |
| `theme_tags` | text[] | `{valentines, summer, holiday, new_arrival, evergreen}` |
| `industry_tags` | text[] | `{fashion, food, tech, beauty, medspa}` |
| `style_tags` | text[] | `{minimal, bold, luxury, playful}` |
| `platform_fit` | text[] | `{instagram_post, instagram_story, facebook, linkedin, tiktok}` |
| `aspect_ratio` | text | `1:1`, `9:16`, `16:9`, `4:5` |
| `input_slots` | jsonb | What user provides: `{product_image: true, logo: true, headline: true, subtext: false, accent_color: true}` |
| `text_zones` | jsonb | Where programmatic text goes: `{headline: {x, y, w, h, align}, cta: {x, y, w, h, align}}` |
| `logo_zone` | jsonb | Logo placement: `{position: "top-left", max_width: 120, max_height: 60}` |
| `quality_score` | float | Internal rating (1-10), updated by Performance Feedback Engine |
| `usage_count` | int | How many times used (analytics) |
| `is_active` | boolean | Enable/disable without deleting |
| `created_at` | timestamp | When added to library |

**Note**: `model_type` column removed — all templates use SeedEdit 3.0. No routing decision needed.

### Prompt Template Example

```text
base_prompt: "Replace the product in the center with {{product_description}}.
Adjust the accent colors to {{brand_color}}.
Keep the same layout, lighting, decorations, and composition.
Style: {{style_tags}}. Professional finish."
```

The Edge Function replaces `{{placeholders}}` with values from the user's Brand Kit + customization inputs.

---

## 5. Provider Summary

| Provider | Model | Cost | Role |
|----------|-------|------|------|
| BytePlus ModelArk | SeedEdit 3.0 (`seededit-3-0-i2i-250628`) | ~$0.03/edit | Primary provider |
| WaveSpeed | SeedEdit 3.0 | ~$0.035/edit | Fallback provider |
| AIML API | SeedEdit 3.0 | ~$0.035/edit | Fallback provider |

**Volume economics**: 3 variants per template = ~$0.09. Generating 10 social posts = ~$0.30.

---

## 6. Key Technical Considerations

1. **Single model simplicity**: No routing logic between models. Every template uses SeedEdit 3.0. Provider routing only selects which SeedEdit host (BytePlus → WaveSpeed → AIML).

2. **Text rendering**: SeedEdit can change text in images but results are not pixel-perfect. Critical text (headlines, prices, CTAs) uses a two-pass approach: SeedEdit handles visual composition without text → programmatic overlay (Sharp/Canvas) renders typography using brand fonts.

3. **Brand consistency**: User's Brand Kit (colors, logo, product photos) is loaded from Module #12 Brand Voice DNA and injected into every SeedEdit prompt automatically.

4. **Speed**: SeedEdit 3.0 generates in ~10-20 seconds. Text overlay adds ~500ms. Total user wait: under 25 seconds.

5. **Batch generation**: At $0.03/edit, batch operations (e.g., "generate 10 Valentine's posts") cost ~$0.30 total. Platform variants run in parallel for faster throughput.

6. **Text-only edits are free**: Changing headline or CTA text re-runs only the programmatic overlay — no SeedEdit call, zero cost.

---

## 7. Integration with Other Pipelines

- **Social Content Pipeline (F4)**: F9 generates the images; F4 generates the captions. Together = full content package (image + platform-optimized text), ready to post.
- **Ad Creator Pipeline (F7)**: Can use image templates for the static ad variant instead of full video generation.
- **Creative Cloner Pipeline (F8)**: Shares the template library concept — video templates for video cloning, image templates for image recreation.

---

## 8. Template Curation Strategy

1. Source high-quality reference ad images or create original template designs
2. Write the `base_prompt` as a SeedEdit instruction with placeholder variables
3. Define `text_zones` and `logo_zone` for programmatic overlay positioning
4. Tag with theme, industry, style, platform, category
5. Quality review and scoring
6. Insert into `image_templates` table

Track `usage_count` and approval rates via Performance Feedback Engine (#22) to identify top performers and retire low-performers.

---

## 9. UX Flow Reference

See `docs/ux/IMAGE_TEMPLATE_UX_FLOW.md` for the complete screen-by-screen user flow, including:
- All 6 screens with engine modules that fire at each step
- Data payloads passed between screens
- Touchpoint events emitted
- Cost model per user action
- Module dependency map

---

## 10. Next Steps (When Ready to Build)

1. Design the `image_templates` table and seed with initial templates (include `text_zones` + `logo_zone`)
2. Ensure BytePlus ModelArk SeedEdit 3.0 is registered in the provider abstraction layer
3. Build the template gallery UI (categorized, filterable, theme-aware)
4. Create the Edge Function: prompt assembly + SeedEdit call + text overlay
5. Integrate with F4 Social Content pipeline for image + caption bundles
