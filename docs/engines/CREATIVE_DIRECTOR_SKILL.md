# CREATIVE DIRECTOR SKILL GUIDE

> **Status**: Active — consumed by `generate-content` prompt builder  
> **Last updated**: 2026-04-08  
> **Owner**: Creative Engine  
> **Consumers**: `buildPromptBundle()`, `applyTextOverlay()`

---

## Purpose

This is the master skill guide that transforms raw campaign inputs (brief, tone, assets, template, platform) into enterprise-grade visual prompts. Every rule here is **dynamic** — it adapts to what the user selected, never hardcoded to a single aesthetic.

---

## 1. PROMPT ARCHITECTURE — The Three-Layer Split

Every generation request MUST be decomposed into three distinct layers:

| Layer | Purpose | Consumed By |
|-------|---------|-------------|
| **Visual Prompt** (≤80 words) | Subject, lighting, composition, mood | Image model (Seedream/Kie) |
| **Image References** | Product/model photos, template style refs | `image_urls[]` array |
| **Text Overlay Metadata** | Headlines, CTAs, brand name, colors | Post-processing (Gemini) |

**CRITICAL**: Never mix text instructions into the visual prompt. The image model cannot render text — it produces artifacts.

---

## 2. VISUAL PROMPT CONSTRUCTION

### Assembly Order (strict hierarchy)

1. **Subject Identity** — What the user uploaded (model, product, or both)
2. **Campaign Direction** — The angle/mood from the structured brief
3. **Skin & Realism Rendering** — Adaptive photorealism rules
4. **Template Style** — If a template was selected, its style overrides defaults
5. **Platform Composition** — Format-specific framing rules
6. **Hard Exclusions** — What to NEVER include

### 2A. Subject Rendering Rules

**When user provides a MODEL (person):**
- Preserve exact identity, likeness, facial features, hair texture
- Visible skin pores, micro-texture, peach fuzz, natural imperfections
- Subsurface scattering for organic light interaction
- NO smoothing, NO beauty filters, NO "flawless" or "perfect skin"
- Position based on campaign tone: editorial candid (luxury), action pose (fitness), authority stance (corporate)

**When user provides a PRODUCT:**
- Hero placement with physical weight and material honesty
- Glass reflections, brushed metal textures, fabric weave — whatever is real
- 60/40 rule: at least 60% clean space, product occupies the visual anchor
- Shot type adapts to campaign: macro detail (premium), lifestyle context (aspirational), flat lay (ecommerce)

**When BOTH model + product:**
- Model is the main subject, product is prominently visible but secondary
- Natural interaction between person and product — no floating/pasted look
- Preserve model's identity while showcasing product features

### 2B. Adaptive Realism Engine

These rules flex based on the campaign's **tone selection**:

| User Tone | Realism Approach |
|-----------|-----------------|
| Professional / Minimal | Clean studio, controlled lighting, minimal grain |
| Luxurious / Bold | Rich contrast, dramatic directional light, film grain |
| Warm / Playful | Golden hour warmth, natural window light, soft shadows |
| Edgy / Urgent | Hard shadows, high contrast, desaturated with accent pops |
| Educational | Even, flat lighting, clean backgrounds, diagram-friendly |

**Universal realism constraints (always applied):**
- Organic skin tones with realistic color balance
- Subtle cinematic film grain — professional movie-still look
- Shot on Nikon Z8 45.7MP mirrorless or equivalent cinema glass
- Background preserved as-is — only slightly cleaner if noisy, no artificial blur
- All facial features, expressions, hair strands, natural imperfections preserved
- Photorealistic result only — no stylization, no illustration, no 3D render

### 2C. Template Respect Protocol

When a user selects a template from the library:

1. **Extract style_guide fields**: lighting, composition, color_palette, mood
2. **These OVERRIDE the default vertical style** — template is the user's explicit choice
3. **Apply prompt_modifiers** from the template as additional directives
4. **Match the template's aspect_ratio and format constraints**

### 2D. Platform Composition Seeds

Each platform has a native aesthetic the prompt must respect:

| Platform | Seed Direction |
|----------|---------------|
| Instagram | Warm editorial tones, discovery-optimized, aspirational |
| TikTok | Vibrant, high-energy, bold colors, dynamic angles |
| LinkedIn | Corporate-premium, clean backgrounds, trustworthy palette |
| Facebook | Community warmth, relatable, approachable, mid-range framing |
| YouTube | Cinematic widescreen, dramatic lighting, thumbnail-optimized |
| X/Twitter | High-impact single frame, maximum contrast, bold focal |

### 2E. Hard Exclusions (always applied)

```
No text, no watermarks, no logos, no borders, no UI elements.
Avoid: stock photo feel, clipart, illustration, 3D render, cartoon, AI-generated look,
airbrushed, porcelain skin, beauty filter, "4k masterpiece" generic tokens.
```

---

## 3. IMAGE REFERENCES — Priority Stack

References go into the `image_urls[]` array, NOT embedded in the prompt:

| Priority | Source | Purpose |
|----------|--------|---------|
| 1 (highest) | User product/model uploads | Identity preservation |
| 2 | Showcase template refs | Style/composition matching |
| 3 | Single reference image | Mood/aesthetic reference |

**Max 4 references** — more causes model confusion.

---

## 4. TEXT OVERLAY — Post-Processing Rules

Text is composited AFTER image generation using Gemini image editing.

### 4A. Typography System (Apple-Grade)

| Element | Weight | Tracking | Line-Height | Behavior |
|---------|--------|----------|-------------|----------|
| Headline | Semibold 600 | -0.02em | 1.1 | Large, commanding, upper portion |
| Subheadline | Regular 400 | -0.01em | 1.3 | Supportive, below headline |
| CTA | Medium 500 | 0.08em | — | ALL CAPS, pill-shaped button |
| Brand Name | Light 300 | 0.04em | — | Small, refined, corner position |

Font: SF Pro Display or Inter — geometric sans-serif ONLY.

### 4B. Color Selection via OKLCH Engine

Text colors are computed from the user's brand seed hex using the OKLCH perceptual color model:

| Token | Scale Step | Usage |
|-------|-----------|-------|
| `vibrant` | 400 | Headlines — eye-catching accent |
| `active` | 600 | CTA button backgrounds |
| `soft` | 200 | Subheadline fills |
| `text` | 900 | Dark readable body text |
| `deep` | 800 | Text shadows (40% opacity) |
| `subtle` | 100 | Near-white tints |

**Contrast rule**: If the image background behind the text area is dark, switch to #FFFFFF. Always maintain WCAG AA minimum contrast.

**Fallback** (no brand colors): White text with `rgba(0,0,0,0.5)` drop shadow.

### 4C. Layout by Format

| Format | Text Placement |
|--------|---------------|
| Story (9:16) | Upper third headline, lower third CTA |
| Reel (9:16) | Centered text, CTA at bottom |
| Post (1:1/4:5) | Upper portion, CTA bottom-right |
| Carousel | Centered, consistent across slides |
| Landscape (16:9) | Left-aligned, cinematic lower-third style |

### 4D. The 60/40 Space Rule

- 60% of canvas is clean breathing room
- Text never overlaps the main subject's face or key product feature
- Generous whitespace around all text elements
- Result must look like a Fortune 500 social media ad

---

## 5. CAMPAIGN INPUT → PROMPT MAPPING

This table shows how each campaign builder field influences the final prompt:

| Campaign Field | Prompt Impact |
|----------------|--------------|
| **Objective** (Awareness/Conversion/etc.) | Adjusts composition intensity and CTA prominence |
| **Core Message** | Injected as the "angle" narrative seed |
| **Tone** (Professional, Playful, etc.) | Selects realism approach from §2B table |
| **CTA Goal** | Determines CTA text and overlay urgency |
| **Target Emotion** (Trust, FOMO, etc.) | Influences lighting mood and color temperature |
| **Headline / Subheadline / CTA** | Extracted to TextOverlayMeta — never in visual prompt |
| **Product/Model uploads** | Primary image references — identity preservation |
| **Template selection** | Overrides default vertical style with template's style_guide |
| **Platform selection** | Applies platform seed + format composition rules |
| **Logo toggle** | Controls whether brand name appears in overlay |
| **Brand palette** | OKLCH tokens computed for text overlay colors |

---

## 6. QUALITY GATES

Before a prompt is sent to the provider, validate:

- [ ] Visual prompt ≤ 80 words
- [ ] No text/copy instructions in visual prompt
- [ ] Image references ≤ 4 URLs
- [ ] User-uploaded assets are in `image_urls[]`, not embedded in prompt
- [ ] Template style_guide respected if template was selected
- [ ] Platform seed applied
- [ ] Realism anchor present
- [ ] Hard exclusions appended
