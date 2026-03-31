

## Update All Pipeline Families with Enterprise Engine Patterns

Applying the 10 Cross-Family Engine Audit patterns to every pipeline doc, plus automating the Cinematic Ad assembly.

---

### What Changes Per Family

Each pipeline doc gets a new **Enterprise Engine Integration** section appended, documenting which shared modules it now uses. Additionally, specific stages are updated inline where the pattern changes the pipeline flow.

---

### F1 — UGC Video Pipeline (`UGC_VIDEO_PIPELINE.md`)

**Additions:**
- Stage 2 (Analyze Image): Switch from GPT-4o to unified `AnalyzeAsset` Edge Function (mode: `product` or `character`)
- Stage 3 (Scene Planning): Upgrade to AGENT framework + Think Tool (currently simple prompt-in/structured-out)
- New Stage 3.5: **Plan Review Gate** — user sees scene count, mood, estimated cost before generation
- New Stage 3.6: **Revision Loop** — if rejected, RevisionAgent takes feedback + original brief, regenerates prompts
- Core Elements Board injected as visual reference for product placement
- Optional music toggle (Suno V5 via Music Engine, runs parallel with video generation)
- Variant A: Add Assembly Engine for optional multi-clip merge (currently single-scene only)
- Re-entry Controller: Resume from any stage via `job_stages` status check
- Tier Router: `veo3_fast` for drafts, `veo3` for approved finals
- SEALCaM: Recommended but not mandatory (UGC aesthetic may conflict with cinematic structure)

---

### F2 — AI Spokesperson (`AI_SPOKESPERSON_PIPELINE.md`)

**Additions:**
- Stage 2 (Analyze Image): Switch to unified `AnalyzeAsset` (mode: `character`)
- Stage 3 (Scene Planning): Already uses AGENT framework — add Think Tool requirement
- New Stage 3.5: **Plan Review Gate** — show planned scenes, cameo character, style before generation
- New Stage 3.6: **Revision Loop** — RevisionAgent for rejected concepts
- Core Elements Board as visual context for avatar settings
- Optional music toggle (parallel lane)
- Assembly Engine for multi-clip concatenation (currently produces standalone clips)
- Re-entry Controller: Resume from prompt/video stage
- Tier Router: `sora2` for drafts, `sora2-pro` for finals

---

### F3 — Product Videography (`PRODUCT_VIDEOGRAPHY_PIPELINE.md`)

**Additions:**
- Stage 2 (Analyze Image): Switch from Gemini free-text to `AnalyzeAsset` (mode: `product`)
- Stage 3 (Scene Planning): Already uses AGENT framework — add Think Tool if missing
- New Stage 3.5: **Plan Review Gate** — show start/end frame descriptions, transition plan, cost estimate
- New Stage 3.6: **Revision Loop** — RevisionAgent for rejected concepts
- SEALCaM adoption: Map existing YAML fields (Composition→Subject+Camera, Lighting→Lighting, etc.) to SEALCaM standard
- Optional music toggle (single scene, so music is a simple overlay)
- Assembly Engine: Music overlay on single-scene video
- Re-entry Controller: Already exists (Switch node) — document as reference pattern for other families
- Tier Router: `veo3_fast` for drafts, `veo3` for finals

---

### F4 — Social Content (`SOCIAL_CONTENT_PIPELINE.md`)

**Additions:**
- Stage 2 (Content Generation): Upgrade to AGENT framework with Think Tool (currently simple GPT-4o call)
- Hook Library injection: Query `hooks` table for top-performing hooks in brand's industry BEFORE generation
- Core Elements Board as visual context for image generation
- Stage 3 (Image Generation): Switch from DALL-E to Seedream 5 Lite via Image Template Engine
- Re-entry Controller: Resume from content/image/approval stages
- Tier Router: Not applicable (text-first, no heavy compute tiers)
- Revision Loop: Already has approval gate — add RevisionAgent for rejected content (currently rejection = stop)

---

### F5 — Cinematic Ad (`CINEMATIC_AD_PIPELINE.md`)

**Additions:**
- Stage 2 (Analyze Elements): Switch to `AnalyzeAsset` (mode: `composite`)
- Stage 3 (Scene Planning): Already uses AGENT framework — add Think Tool, standardize on SEALCaM output format
- New Stage 3.5: **Plan Review Gate** — show all scenes, script, music mood, estimated 20-30 min generation time
- New Stage 3.6: **Revision Loop** — RevisionAgent for rejected concepts
- SEALCaM adoption: Convert YAML fields to SEALCaM 6-field standard
- **Stage 8 (Assembly): AUTOMATE** — this is the critical fix:
  - Use Fal AI `fal-ai/ffmpeg-api/merge-videos` for video concatenation (proven in F1B)
  - Then a second FFmpeg pass for audio mixing:
    - Background music at reduced volume (~20-30%)
    - Voiceover at full volume
    - Fade transitions (0.5s crossfade between scenes)
    - Final export with aspect ratio enforcement
  - Assembly sequence: Concat videos → Mix music → Overlay voice → Export
  - Provider: Fal AI FFmpeg API for cloud-based processing (no local server needed)
- Re-entry Controller: Each of the 5 lanes gets independent resume capability
- Tier Router: `veo3_fast` + `nano-banana-pro` for drafts, `veo3` + `nano-banana-pro 2k` for finals
- Hook Library: Inject hooks into script/caption generation

---

### F6 — Core Elements Board (`CORE_ELEMENTS_BOARD.md`)

**Additions:**
- Elevate to **brand onboarding prerequisite** — auto-generate during brand setup, not manual trigger
- Store as permanent brand asset accessible by all families
- Add `AnalyzeAsset` (mode: `composite`) as optional pre-step for text description
- Re-entry Controller: Simple (single-step pipeline), but add retry logic
- No approval gate needed (fast generation, easy to regenerate)

---

### F7 — Ad Creator (`AD_CREATOR_PIPELINE.md`)

**Additions:**
- Stage 2 (Analyze Image): Switch to `AnalyzeAsset` (mode: `product`)
- SEALCaM adoption: Recommended for image/video prompt structure
- Core Elements Board as reference for the Creative Director
- Optional music toggle (parallel lane, single-scene overlay)
- Assembly Engine: Music overlay on single-scene video
- Re-entry Controller: Resume from approval/image/video stages
- Tier Router: `veo3_fast` for drafts (pre-approval), `veo3` for approved finals
- Hook Library: Inject hooks into caption generation
- Already has: AGENT framework, Plan Review Gate, Revision Loop (reference pattern)

---

### F8 — Creative Cloner (`CREATIVE_CLONER_PIPELINE.md`)

**Additions:**
- Stage 1 (Video Analysis): Already uses Gemini + SEALCaM — document as reference pattern
- Stage 2 (Prompt Gen): Already uses AGENT-style framework — add Think Tool requirement
- New Stage 2.5: **Plan Review Gate** — show recreated scene plan, compare to original structure
- New Stage 2.6: **Revision Loop** — RevisionAgent for rejected recreations
- Core Elements Board as brand context for prompt generation
- Stage 3 (Assembly): Use shared Assembly Engine (video concat + music overlay)
- `AnalyzeAsset` (mode: `scene`) for standardized video analysis
- Re-entry Controller: Resume from analysis/prompt/image/video/music stages
- Tier Router: `kling-v2.6` for drafts, `kling-v2.6-pro` for finals
- Hook Library: Inject hooks into script generation

---

### Cinematic Ad Assembly Automation (Detailed)

The current doc says "Not automated in n8n workflow — currently requires manual assembly." Here is the automated replacement:

```text
Stage 8: Automated Assembly Pipeline

Step 1 — Concatenate scene videos
  Provider: Fal AI (fal-ai/ffmpeg-api/merge-videos)
  Input: Array of scene video URLs in order
  Output: Single concatenated video URL
  Polling: ~60s, check video.url

Step 2 — Mix audio layers
  Provider: Fal AI FFmpeg API (custom FFmpeg command)
  Command equivalent:
    ffmpeg -i concat.mp4 -i music.mp3 -i voice.mp3 \
      -filter_complex "[1:a]volume=0.25[bg];[2:a]volume=1.0[vo];[bg][vo]amix=inputs=2[a]" \
      -map 0:v -map "[a]" -c:v copy -c:a aac -shortest output.mp4
  Input: Concatenated video + music URL + voice URL
  Output: Final assembled video with mixed audio

Step 3 — Add transitions (optional)
  0.5s crossfade between scenes using xfade filter
  Applied during concatenation step if enabled

Step 4 — Export
  Aspect ratio enforcement (16:9 or 9:16)
  Store final MP4 in Supabase Storage
  Create artifact record
```

---

### Cross-Family Engine Audit Updates

Update `CROSS_FAMILY_ENGINE_AUDIT.md`:
- Section 9 (Assembly): Change status from "Planned for F5" to "Automated in F5 via Fal AI FFmpeg"
- Add Hook Library as shared engine module #11
- Mark all families as adopting the enterprise patterns

---

### Files to Modify (9 total)

1. `docs/pipelines/UGC_VIDEO_PIPELINE.md` — append Enterprise Engine Integration section
2. `docs/pipelines/AI_SPOKESPERSON_PIPELINE.md` — append Enterprise Engine Integration section
3. `docs/pipelines/PRODUCT_VIDEOGRAPHY_PIPELINE.md` — append Enterprise Engine Integration section
4. `docs/pipelines/SOCIAL_CONTENT_PIPELINE.md` — append Enterprise Engine Integration section
5. `docs/pipelines/CINEMATIC_AD_PIPELINE.md` — rewrite Stage 8 as automated + append Enterprise Engine Integration
6. `docs/pipelines/CORE_ELEMENTS_BOARD.md` — append Enterprise Engine Integration section
7. `docs/pipelines/AD_CREATOR_PIPELINE.md` — append Enterprise Engine Integration section
8. `docs/pipelines/CREATIVE_CLONER_PIPELINE.md` — append Enterprise Engine Integration section
9. `docs/pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` — update Section 9 + add Hook Library as #11

