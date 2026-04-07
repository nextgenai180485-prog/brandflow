

## Wire Showcase Template as Creative Reference in Generation Pipeline

### Current State
- Showcase → "Create Campaign" passes metadata via route state (title, tags)
- This pre-fills the campaign title and instructions text
- Generation runs through Decision Engine → Prompt Builder → Provider Router
- The original `ad_reference_library` entry is **not** attached as a reference asset

### What Needs to Change

**1. Pass the `media_url` and `id` through route state** (`EmptyCampaigns.tsx` → `NewCampaign.tsx`)

Currently only passes `id`, `title`, tags. Add `mediaUrl` so the Creative Direction step can display it as the reference image.

**2. Auto-attach as library reference in NewCampaign** (`NewCampaign.tsx`)

When `showcaseState.fromShowcase` is true and the template has a `mediaUrl`:
- Auto-populate `creativeReferenceAssets` with the showcase image
- Pre-select matching platforms from `platformTags`
- Set content type based on `compatible_families` (F8 → image, F1 → ugc_video, etc.)

**3. Pass reference image URL to generate-content edge function** (`NewCampaign.tsx` + `generate-content/index.ts`)

Add an optional `referenceImageUrl` field to the generation request body. When present:
- The prompt builder appends: `"Reference style: [URL]. Match the composition, lighting, and mood of this reference."`
- For F8 Creative Cloner family, this becomes the primary input for style cloning
- For other families, it's used as a soft style guide

### Files Changed

| File | Change |
|---|---|
| `src/components/EmptyCampaigns.tsx` | Add `mediaUrl` to route state passed to NewCampaign |
| `src/components/ShowcaseDetailModal.tsx` | Pass `mediaUrl` in CTA navigation |
| `src/pages/NewCampaign.tsx` | Auto-populate reference assets, platforms, and content type from showcase state; pass `referenceImageUrl` to edge function |
| `supabase/functions/generate-content/index.ts` | Accept `referenceImageUrl`, inject into prompt builder for style-aware generation |

### Technical Notes
- No new tables or migrations needed
- Reference URL is used as prompt text injection, not as an image-to-image input (Seedream 5 doesn't support img2img natively — that would require SeedEdit)
- For true style cloning (F8), the reference URL would be passed to a future `creative-cloner` edge function
- Safe fallback: if no `referenceImageUrl`, generation works exactly as it does now

