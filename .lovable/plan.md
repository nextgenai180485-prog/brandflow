## Product/Model Swap Assets — Enterprise Implementation

### Concept
Two distinct asset layers in the workspace:
- **Reference Assets** (already built) = style/mood direction ("make it look like THIS")
- **Swap Assets** (new) = user's own content ("put MY product/model/logo INTO it")

### UI: New "Your Assets" Section in Workspace Builder

**Location**: Below the reference strip, above the "Add from Library" picker

**Layout**: Horizontal scrollable strip (same pattern as reference strip) with:
- Each card shows thumbnail + role badge (product / model / logo / background)
- Hover reveals ✕ remove button + role dropdown to re-tag
- "+" button opens a picker modal (upload new or select from brand_assets library)
- Role auto-detection: image filename containing "logo" → auto-tag as logo, etc.

### Upload Flow
- Inline drag-and-drop zone OR file picker
- Files upload to `campaign_assets` bucket under user's folder
- Saved to `brand_assets` table (reusable across campaigns)
- Role tag stored in component state (passed to generation engine)

### Data Model
No DB migration needed — role tagging is per-campaign session state. The swap assets are `brand_assets` records; their role context is passed to the generation engine at creation time.

**State shape:**
```ts
interface SwapAsset {
  id: string;
  file_name: string;
  file_url: string;
  asset_type: string;
  role: 'product' | 'model' | 'logo' | 'background' | 'other';
}
```

### Files to Create/Edit
1. **New: `src/components/campaign/SwapAssetStrip.tsx`** — the tagged asset strip component
2. **Edit: `src/pages/NewCampaign.tsx`** — integrate SwapAssetStrip into the builder zone
3. **Edit: generation engine call** — pass swap assets with roles to the edge function

### Generation Integration
Swap assets get passed as `swapAssets` array in the generation payload, separate from `referenceImageUrl`. The edge function uses them for targeted product/model injection in prompts.
