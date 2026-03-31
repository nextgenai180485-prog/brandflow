

## Document Family 8: Creative Cloner Pipeline + SEALCaM Framework

### Files to Create

**1. `docs/pipelines/CREATIVE_CLONER_PIPELINE.md`**

Technical reference for the video-to-video recreation pipeline:

- Overview: Takes an existing video + reference images, analyzes the cinematic structure via SEALCaM, then recreates each scene with new subjects/products
- 4-lane architecture diagram (PROMPTS → IMAGES → VIDEOS → MUSIC)
- Stage specs:
  - **Video Analysis**: Gemini 3 Pro video analysis with full SEALCaM system prompt (AGENT-style)
  - **Prompt Generation**: Gemini 3 Pro (via OpenRouter) AI Agent — outputs `script`, `music_prompt`, `scenes[]` with `start_image_prompt` and `video_prompt`
  - **Image Generation**: WaveSpeed `nano-banana-pro/edit` — reference image compositing with SEALCaM-structured prompts, 2K resolution
  - **Video Generation**: WaveSpeed `kling-v2.6-pro` image-to-video — 5s clips, cfg_scale 0.5, poll pattern
  - **Music Generation**: Kie AI Suno V5 — instrumental, returns 2 variants via `sunoData[0].audioUrl` / `sunoData[1].audioUrl`
- Polling patterns for video (15s wait + status check loop) and music (5min wait + status check)
- Provider summary table
- Brandflow migration notes

**2. `docs/pipelines/SEALCAM_FRAMEWORK.md`**

Standalone reference doc for the SEALCaM prompting standard:

- Framework definition (S, E, A, L, Ca, M) with field descriptions
- Per-field terminology guidelines
- Mandatory field ordering rule
- Usage in image prompts vs video prompts
- Integration note: which families should adopt SEALCaM (Creative Cloner mandatory, recommended for Cinematic Ad and Ad Creator)

### Steps

1. Create `docs/pipelines/CREATIVE_CLONER_PIPELINE.md` with full technical spec from the R51 workflow JSON
2. Create `docs/pipelines/SEALCAM_FRAMEWORK.md` as a shared prompting reference
3. No changes to existing pipeline docs (they can reference SEALCaM later when we build)

