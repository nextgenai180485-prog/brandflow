
# Foreplay Ad Intelligence Integration

## What This Does
Adds a **live competitor ad search** powered by Foreplay's Discovery API directly into BrandFlow's Content Library and Campaign Wizard. Users search by keyword, domain, or niche — see real winning ads with thumbnails — click to auto-extract SEALCaM analysis — and select ads as style references for campaign generation. Zero friction: search → see → select → generate.

## Architecture

### 1. Secret: `FOREPLAY_API_KEY`
- Store via `add_secret` tool — user provides their Foreplay API key

### 2. Edge Function: `foreplay-search` 
Single edge function that proxies Discovery API searches with these capabilities:
- **Search ads** by keyword, domain, niche, platform, format (image/video)
- **Filter** by live status, running duration, language, market target
- **Returns** thumbnail, video URL, headline, CTA, brand name, display format, categories, running duration
- Passes through `X-Credits-Remaining` header so the UI can show credit balance
- Handles 402 (out of credits) and 429 (rate limited) gracefully

### 3. UI: "Ad Intelligence" Tab in Both Libraries

**UserLibraries.tsx** (`/dashboard/libraries`):
- New 6th tab: "Ad Intelligence" with `Search` icon
- Shows a search bar with filters (keyword, platform dropdown, format dropdown)
- Results render as the same card grid with thumbnails
- Click a result → detail dialog showing ad copy, CTA, brand, running duration
- "Analyze Style" button → calls `analyze-asset` edge function with the ad's image/thumbnail URL to auto-extract SEALCaM JSON

**AssetLibraryPicker.tsx** (campaign wizard modal):
- New 7th tab: "Ad Intel" 
- Same search + results grid
- Ads are selectable just like any other library asset — clicking adds them to `selectedAssets`
- The ad's thumbnail/video URL becomes the `file_url` on the LibraryAsset, with `source_tab: "ad_intelligence"`
- Selected ads flow into the generation engine as style references (same as image/video templates)

### 4. Data Flow (No New Tables)
- Foreplay ads are **not stored** in our DB — they're searched live and selected ephemerally for the campaign session
- Selected ads are converted to `LibraryAsset` objects with the Foreplay thumbnail/image URL
- The generation engine already consumes `templateRefs` from selected assets — Foreplay ads slot in identically
- If a user wants to permanently save a Foreplay ad, they can use the existing "Save to Library" flow (future enhancement)

### 5. Enterprise-Grade Details
- **Credit awareness**: Show remaining Foreplay credits in the UI header
- **Debounced search**: 500ms debounce on search input to avoid burning credits
- **Error handling**: 402 → "Foreplay credits exhausted" toast, 429 → "Rate limited, retry in a moment"
- **Smart defaults**: Pre-fill search with user's industry from their profile

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/foreplay-search/index.ts` | **New** — Edge function proxying Foreplay Discovery API |
| `src/pages/UserLibraries.tsx` | Add "Ad Intelligence" tab with live search |
| `src/components/AssetLibraryPicker.tsx` | Add "Ad Intel" tab in campaign picker modal |

## What It Does NOT Do (Keeping Scope Tight)
- Does NOT create new DB tables (ads are ephemeral/live-searched)
- Does NOT replace existing template previews
- Does NOT integrate Spyder or SwipeFile APIs (can add later)
- Does NOT auto-save Foreplay ads to our library (future feature)
