

# Wire OKLCH Color Engine + Apple-Grade Typography into Text Overlay

## What This Does
Makes every generated creative look like it came from an Apple design studio: mathematically precise brand colors derived from your seed hex via the OKLCH perceptual color engine, paired with premium typography directives (SF Pro / Inter weight hierarchy, precise tracking/leading, optical sizing).

## Architecture

### 1. Port OKLCH Color Engine to Edge Function
**File**: `supabase/functions/generate-content/index.ts`

Copy the minimal OKLCH math from `src/lib/colorEngine.ts` into the edge function:
- `hexToRgb`, `srgbToLinear`, `linearRgbToOklab`, `oklabToOklch`, `oklchToOklab`, `oklabToLinearRgb`, `clampToGamut`, `oklchToHex`
- `generateBrandScale` — takes a single hex seed, returns 10-step scale with semantic tokens

### 2. Compute Brand Color Tokens in `buildPromptBundle`
When `brandContext.brandColors.primary` exists, run it through `generateBrandScale` to produce:
- `vibrant` (step 400) — headlines
- `active` (step 600) — CTA backgrounds
- `soft` (step 200) — subtitle fills
- `text` (step 900) — dark readable text
- `deep` (step 800) — shadows/backing
- `subtle` (step 100) — near-white tints

Attach these hex values to `textOverlay.brandColors`.

### 3. Rewrite `applyTextOverlay` with Exact Hex + Apple Typography

Replace the current vague line 842 (`"use brand color accents"`) with:

```
Typography system (Apple-grade):
- Font: SF Pro Display or Inter — clean geometric sans-serif only
- Headline: Semibold 600 weight, -0.02em tracking, 1.1 line-height
  Color: ${vibrant} or #FFFFFF — pick whichever has higher contrast
- Subheadline: Regular 400 weight, -0.01em tracking, 1.3 line-height
  Color: ${soft} or #FFFFFF
- CTA: Medium 500 weight, ALL CAPS, 0.08em tracking
  Background: ${active}, text: #FFFFFF, rounded pill shape
- Brand name: Light 300 weight, 0.04em tracking
  Color: ${text}
- Text shadow: ${deep} at 40% opacity, 2px blur — only if needed for contrast
- WCAG AA minimum contrast required on all text
- No decorative fonts, no serifs, no outlines, no gradients on text
```

### 4. Fallback
If no brand colors exist: white text, `rgba(0,0,0,0.5)` shadow — current safe default preserved.

## Files Changed
- **`supabase/functions/generate-content/index.ts`** — Add ~120 lines of OKLCH math, update `TextOverlayMeta` interface, rewrite overlay color/typography directives

## Result
- Text colors are mathematically computed from your brand seed — no AI guessing
- Typography follows Apple's exact weight/tracking/leading hierarchy
- Every generated creative has consistent, premium-feeling text layout

