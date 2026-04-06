
# Tier 1: Complete the Core Loop — Enterprise Execution Plan

## Phase 1: Creative Director Database (Foundation Layer)
**Why first:** Every subsequent phase depends on structured data storage.

### Migration 1: `video_templates`
- `id`, `family` (F1/F2/F5), `template_name`, `sealcam_analysis` (JSONB — pre-computed SEALCaM breakdown), `hook_type`, `duration_s`, `aspect_ratio`, `mood`, `tags[]`, `example_url`, `is_active`, `usage_count`
- Seeded with 10-15 curated templates per family
- RLS: Read-only for all authenticated users (curated library)

### Migration 2: `hooks`
- `id`, `hook_text`, `hook_type` (question/statistic/provocative/visual), `family`, `platform`, `effectiveness_score`, `usage_count`
- Seeded with proven hook formulas per platform
- RLS: Read-only for authenticated users

### Migration 3: `creative_history`
- `id`, `profile_id`, `campaign_id`, `family`, `sealcam_scenes` (JSONB), `direction_output` (JSONB — full DirectorOutput), `generation_params` (JSONB), `result_status`, `user_feedback`
- RLS: Users own their history

### Migration 4: `asset_memory`
- `id`, `profile_id`, `asset_id`, `memory_type` (style_preference/color_preference/composition_preference), `pattern_key`, `pattern_value`, `confidence`, `frequency`
- RLS: Users own their memory

**Deliverable:** Schema deployed, types regenerated, ready for consumption.

---

## Phase 2: Wire Creative Direction → Generation Pipeline
**Why second:** The structured output from Phase 1's tables needs to flow into the generation edge function.

### Step 2a: Persist Creative Direction on Campaign Create
- When `handleCreate` fires with a `creativeDirection`, store it in `creative_history`
- Attach `direction_output` (family, scenes, hook_strategy, mood, aspect_ratio) to the campaign payload
- Pass `creativeDirection` into `generate-content` edge function body

### Step 2b: Update `generate-content` to consume Creative Direction
- Add new branch: if `creativeDirection` exists, use SEALCaM scenes to build prompts instead of generic `buildImagePrompt`
- Route to correct asset_type based on family:
  - F1_UGC → `video` asset, UGC-style prompt construction
  - F2_SPOKESPERSON → `video` asset, talking-head prompt construction  
  - F5_CINEMATIC → `video` asset, cinematic prompt construction
- For image content types in the same campaign, continue using existing image pipeline
- Store `family`, `sealcam_scenes`, and `hook_strategy` in `generated_assets.rationale`

### Step 2c: SEALCaM → Prompt Compiler
- Create a `compileSealcamToPrompt(scene: SEALCaMScene, family: string)` function inside the edge function
- Transforms structured scene data into provider-specific prompt strings
- Family-aware: F1 adds "handheld, raw, authentic" modifiers; F5 adds "cinematic, 4K, dramatic"

**Deliverable:** Campaign creation with video content types passes structured creative direction to the generation pipeline.

---

## Phase 3: Video Generation Integration (Replicate Kling)
**Why third:** Now that prompts flow correctly, we need the actual video provider.

### Step 3a: Add Kling 2.5 to Provider Router
- Update `generate-content` edge function with video generation branch
- Use Replicate API (`REPLICATE_API_KEY` already configured)
- Model: `kling-ai/kling-v2.5-pro` for primary, `kling-ai/kling-v2.5-standard` as fallback
- Parameters: `prompt`, `duration` (5s/10s), `aspect_ratio`, `negative_prompt`

### Step 3b: Async Video Generation Flow
- Video generation takes 60-120s — use async polling pattern:
  1. Submit to Replicate → get prediction ID
  2. Store prediction ID in `generated_assets` with status `generating`
  3. Use `EdgeRuntime.waitUntil()` to poll Replicate for completion
  4. On completion: download video → upload to `campaign_assets` bucket → update `generated_assets` with URL
- Client polls `generated_assets` table for status changes (existing pattern)

### Step 3c: Multi-Scene Stitching (F5 Cinematic)
- For multi-scene directions (2-4 scenes), generate each scene as a separate video clip
- Store scene clips as individual `generated_assets` linked to the campaign
- Future: FFmpeg concatenation in post-production engine

### Step 3d: Cost & Instrumentation
- Track `generation_cost` (Kling pricing per generation)
- Track `generation_time_ms` for each video asset
- Store `provider: "replicate/kling-2.5"` for audit trail

**Deliverable:** Real video output from SEALCaM scenes via Kling, stored and viewable in campaign review.

---

## Phase 4: Accept & Generate Flow (End-to-End Integration)
**Why last:** This is the UX polish that ties everything together.

### Step 4a: Campaign Review — Video Preview
- Update `CampaignReview.tsx` to detect video assets (`asset_type === "video"`)
- Render `<video>` element inside the phone preview instead of `<img>`
- Show generation progress indicator for in-flight video generations

### Step 4b: Family-Aware Generation Matrix
- Update the generation matrix builder to respect family routing:
  - If `creativeDirection.family === "F1_UGC"` → generate UGC-style video per platform
  - If `creativeDirection.family === "F5_CINEMATIC"` → generate one hero video, adapt aspect ratios per platform
  - If `creativeDirection.family === "F2_SPOKESPERSON"` → placeholder (requires voice + lipsync, Tier 2)
- Show family badge on generated video assets in review

### Step 4c: Creative History Feedback Loop
- After user approves/rejects generated video, write to `creative_history.user_feedback`
- Update `asset_memory` with learned preferences (color patterns, mood preferences, hook effectiveness)
- Future: Feed this back into Visual Director prompts for improved suggestions

### Step 4d: Generation Cost Summary
- Show total generation cost on the Review step before "Create Campaign"
- Estimated cost = (number of video assets × avg Kling cost) + (number of image assets × avg Seedream cost)
- Display in the CMO Strategy Mirror panel

**Deliverable:** Complete end-to-end flow: Brief → Structure → Generate Video → Review → Approve.

---

## Execution Order & Dependencies

```
Phase 1 (DB) ──→ Phase 2 (Wiring) ──→ Phase 3 (Video Provider) ──→ Phase 4 (UX Polish)
   ↓                    ↓                      ↓                         ↓
 Tables ready      Prompts flow          Videos generate          Full loop works
 Types updated     History persisted     Async polling            Feedback captured
```

**Estimated scope:** 4 implementation sessions, each building on the previous.
**No phase can be skipped** — each is a dependency for the next.
