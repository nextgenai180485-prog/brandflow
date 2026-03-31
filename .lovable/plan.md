

## Save All 7 Pipeline Specs to docs/pipelines/

**Problem**: Only `UGC_VIDEO_PIPELINE.md` exists on disk. The other 6 pipeline families were reverse-engineered from your n8n workflows during our conversation but never persisted. If conversation history is lost, those specs are gone.

### Files to Create

| File | Family | Source Workflow |
|------|--------|---------------|
| `docs/pipelines/UGC_VIDEO_PIPELINE.md` | Already exists | R38 + Nanobanana |
| `docs/pipelines/AI_SPOKESPERSON_PIPELINE.md` | Family 2 | 02 - AI Spokesperson Video |
| `docs/pipelines/PRODUCT_VIDEOGRAPHY_PIPELINE.md` | Family 3 | 03 - Product Videography |
| `docs/pipelines/SOCIAL_CONTENT_PIPELINE.md` | Family 4 | Multi-Platform Social Content Automation |
| `docs/pipelines/CINEMATIC_AD_PIPELINE.md` | Family 5 | R50 Cinematic Adverts System |
| `docs/pipelines/CORE_ELEMENTS_BOARD.md` | Family 6 | Core Elements Board prompt |
| `docs/pipelines/AD_CREATOR_PIPELINE.md` | Family 7 | R36 The Ad Creator AI Agent |

### What Each Doc Will Contain

Each markdown file follows the same structure as the existing UGC doc:
- Overview and purpose
- Pipeline stages diagram (ASCII)
- Per-stage technical spec: provider, API endpoint, request/response schema, prompts, polling pattern
- Provider summary table
- Brandflow implementation notes (what changes from n8n)

### Steps

1. Create `AI_SPOKESPERSON_PIPELINE.md` — Two-part batch system (scene generation via Sora2/Sora2-Pro), character/voice asset resolution, batch polling
2. Create `PRODUCT_VIDEOGRAPHY_PIPELINE.md` — Gemini 3 Pro vision analysis, WaveSpeed start/end frames, Kie AI FIRST_AND_LAST_FRAMES_2_VIDEO generation type
3. Create `SOCIAL_CONTENT_PIPELINE.md` — GPT-4o multi-platform text generation (7 platforms), DALL-E/Seedream image, approval gate, platform API publishing
4. Create `CINEMATIC_AD_PIPELINE.md` — 5-lane parallel: Gemini script/ClearCam YAML, WaveSpeed nano-banana-pro images, Veo3_fast video, Suno V5 music, ElevenLabs voice
5. Create `CORE_ELEMENTS_BOARD.md` — Asset prep pipeline: wireframe + character + setting + product inputs, nano-banana-pro compositing
6. Create `AD_CREATOR_PIPELINE.md` — GPT-4o vision analysis, Creative Director AI Agent (AGENT framework), pre-generation approval gate, revision loop, single-scene Kie AI rendering

All specs will be reconstructed from the n8n workflow JSON data you shared and our analysis conversations.

