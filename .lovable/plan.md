

# Consolidate Wizard Steps + Bulletproof Auto-Save

## Current State

The wizard has 5 steps: **Details → Platforms → Content Type → Creative Direction → Review**

Auto-save triggers on every state change (title, platforms, contentTypes, swapAssets, etc.) — it does NOT require clicking "Next." However, there's a guard: it only saves when `title.trim() || platforms.length > 0 || contentTypes.length > 0`, meaning if a user only uploads assets without typing a title, nothing saves.

Assets (AssetLibraryPicker, SwapAssetStrip, logo toggle) currently live under the **Details** step, making it overloaded while **Platforms** is very thin (just a grid selector).

## Enterprise UX Assessment

The current 5-step wizard creates unnecessary friction:
- **Details** is overloaded (name + brief + assets + swap assets + logo toggle)
- **Platforms** is too thin (single selector)
- Users must mentally separate "what I'm building" from "where I'm publishing" from "what assets to use" — but these are interrelated decisions

Enterprise tools (Canva, Adobe Express, Figma) consolidate related inputs into fewer, denser steps to reduce click-through fatigue.

## Proposed Step Restructure

Collapse from 5 steps to **4 steps**:

```text
Step 1: Campaign Brief     — Name, Objective, Tone, CTA, Copy, Emotion
Step 2: Assets & Platforms  — Your Assets (product/model/logo), Templates, Platform selector, Content type, Logo toggle
Step 3: Creative Direction  — (video only, same as now)
Step 4: Review & Launch     — Summary + generate
```

### Why This Works

1. **Step 2 becomes the "production setup"** — everything about *what goes in* and *where it goes out* lives together. Users see their assets alongside their target platforms, which is how they naturally think: "I have this product photo, I want it on Instagram and TikTok."

2. **Fewer clicks to save state** — since auto-save triggers on any state change, consolidating means more fields change per step, giving the system more save opportunities.

3. **Labels**: "Select from Asset Library" → renamed to **"Templates"** (style references). SwapAssetStrip already labeled as product/model/logo → grouped under **"Your Assets"** header.

## Auto-Save Hardening

- Remove the guard that requires title OR platforms — save on ANY meaningful interaction (asset upload, template selection, swap asset added)
- Add `beforeunload` event listener to flush pending saves when user closes tab
- Add `useEffect` cleanup that forces an immediate save (no debounce) on component unmount / route change

## Technical Changes

### `src/pages/NewCampaign.tsx`
- Change `ALL_STEPS` from `["Details", "Platforms", "Content Type", "Creative Direction", "Review"]` to `["Campaign Brief", "Assets & Delivery", "Creative Direction", "Review"]`
- Move AssetLibraryPicker, SwapAssetStrip, logo toggle, platform selector, and content type selector into the "Assets & Delivery" step
- Keep CreativeBriefBuilder + campaign name in "Campaign Brief"
- Update step validation: step 0 requires title, step 1 requires platforms + content types
- Rename AssetLibraryPicker trigger label from "Select from Asset Library" to "Templates"
- Add "Your Assets" section header above SwapAssetStrip

### `src/hooks/useAutoSaveDraft.ts`
- Relax the save guard: trigger save when ANY of title, platforms, contentTypes, swapAssets, or selectedAssets has data
- Add `beforeunload` listener to flush pending timer immediately
- On unmount, if timer is pending, execute save synchronously (clear debounce, save immediately)

### `src/components/AssetLibraryPicker.tsx`
- Rename display label from "Select from Asset Library" to "Templates" with subtitle "Browse style references and templates"

