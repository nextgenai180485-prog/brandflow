

## UX Flow Validation: Friction Points Found

### Current Flow
1. **`/dashboard`** — Command Center (stats, campaign grid, inspector sheet)
2. **`/dashboard/campaigns/new`** — 5-step wizard with bottom Source Gallery + simulator
3. After generation → blind redirect to `/dashboard`

### Friction Points Identified

**1. Bottom Source Gallery steals 30% of vertical space**
The `h-[220px]` / `h-[260px]` bottom zone compresses the builder and simulator into ~70% of viewport. Users scroll inside a no-scroll workspace. This is the biggest friction — it forces cramped interactions in both panels.

**2. Post-generation dead drop**
Line 277: `navigate("/dashboard")` — after clicking "Generate Campaign," the user is dumped to the dashboard with no feedback loop. No progress indicator, no auto-open of the campaign they just created. They have to find their campaign card and click it.

**3. Mobile still has a dead "Source" tab**
Lines 578-579: Three-tab mobile layout includes "Source" which will be empty once the gallery is removed. Should be 2 tabs (Builder / Preview).

**4. Simulator is static during most steps**
The simulator only shows `selectedTemplate?.media_url`. During Platforms, Content Type, and Review steps, it displays a generic placeholder — wasted real estate. It should react to selections (aspect ratio changes, content type labels).

**5. No campaign duplication**
Enterprise users expect "Duplicate" on existing campaigns. Currently only delete exists.

**6. Review step math ignores reference assets**
Line 473: Shows `platforms × contentTypes` but doesn't factor in `selectedAssets.length` for the multiplier.

### Plan: 6 Targeted Fixes

#### Fix 1: Remove Bottom Source Gallery
- Delete lines 697-705 in `NewCampaign.tsx` (the `h-[220px]` bottom zone)
- Remove `SourceGallery` import and `selectedTemplate` state
- Builder + Simulator fill 100% viewport height
- `AssetLibraryPicker` (already in Details step, line 333) becomes the sole asset entry point

**Files:** `src/pages/NewCampaign.tsx`

#### Fix 2: Remove Mobile "Source" Tab
- Delete the third `TabsTrigger` (line 578-579) and its content block (lines 612-619)
- Mobile becomes 2-tab: Builder / Preview

**Files:** `src/pages/NewCampaign.tsx`

#### Fix 3: Wire Simulator to Live Context
- Pass `aspectRatio` prop based on first selected platform format
- Pass `contentTypeLabel` during Content Type step
- During Review, cycle through `selectedAssets` thumbnails
- Replace `selectedTemplate?.media_url` with a derived `simulatorPreviewUrl`

**Files:** `src/pages/NewCampaign.tsx`, `src/components/campaign/CampaignSimulator.tsx`

#### Fix 4: Post-Generation Stay + Auto-Open
- After `handleCreate` succeeds, instead of `navigate("/dashboard")`:
  - Navigate to `/dashboard?open={campaign.id}`
  - The dashboard already has auto-open logic (lines 42-48) that reads `?open=` param
  - This ensures the inspector sheet opens immediately showing the new campaign with generation progress

**Files:** `src/pages/NewCampaign.tsx` (1 line change)

#### Fix 5: Campaign Duplication
- Add "Duplicate" action to `CampaignCard` hover strip
- Creates a copy with same title + " (copy)", same platforms/content types, status "draft"
- Routes to `/dashboard/campaigns/new` pre-filled

**Files:** `src/components/campaign/CampaignCard.tsx`, `src/pages/Dashboard.tsx`

#### Fix 6: Asset Multiplier in Review
- Update review math: `max(1, selectedAssets.length) × platforms.length × contentTypes.length`
- Label: "5 references × 2 platforms × 1 type = 10 assets"

**Files:** `src/pages/NewCampaign.tsx`

### Impact Summary
- **Fixes 1-2**: Reclaim ~30% viewport, eliminate dead UI
- **Fix 3**: Simulator becomes useful across all steps instead of just Details
- **Fix 4**: Zero post-creation friction (1-line change, high impact)
- **Fix 5**: Enterprise expectation for campaign reuse
- **Fix 6**: Clarity on what the generation will produce

