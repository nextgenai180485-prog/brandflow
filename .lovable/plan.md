

## Document All Generation Pipelines

Now that I've reverse-engineered all three uploaded workflows, I'll create comprehensive technical reference docs for each and update the existing UGC pipeline doc.

### Summary of What Was Found

**Workflow 02 — AI Spokesperson Video** is fundamentally different from UGC. It's a two-part batch system:
- Part 1: AI agent generates scene prompts from a "master prompt" template + topic + optional cameo character + optional image reference
- Part 2: Separate batch run creates videos via **Kie AI Sora2/Sora2-Pro** (not Veo3)
- Supports text-to-video AND image-to-video modes
- Has social publishing wired (Blotato — LinkedIn, Facebook, TikTok, Threads, Twitter, Instagram, BlueSky, YouTube, Pinterest)

**Workflow 03 — Product Videography** is a cinematic pipeline with a re-entrant state machine:
- Three phases triggered via webhook, using Airtable as state store
- Phase 1: Generate cinematic prompts (starting frame, ending frame, transition)
- Phase 2: Generate start + end frame images via **WaveSpeed AI** (nano-banana-pro)
- Phase 3: Generate video from start+end frames via **Kie AI Veo3** using `FIRST_AND_LAST_FRAMES_2_VIDEO`
- Takes TWO product images as input, uses Gemini 3 Pro for image analysis

**Workflow 04 — Social Content Batch** is a UGC variant nearly identical to the already-documented Nanobanana (Variant B), but uses **Kie AI** for image generation instead of Fal AI. This becomes **Variant C** in the UGC doc.

### Files to Create/Update

**1. Create `docs/pipelines/AI_SPOKESPERSON_PIPELINE.md`**
- Pipeline flow: Master Prompt → Analyze Image → AI Agent (prompt generation) → Log Prompts → Create Sora2 Video → Poll → Log Result
- Inputs: topic/prompt, video_count, master_prompt_reference, image_reference (optional), cameo (optional), model (sora2/sora2-pro), aspect_ratio
- AI Agent system prompt: Video Scene Prompt Expander — generates title, caption (with hashtags), video prompt, per scene
- Cameo handling: @mention injection into prompts
- Video API: Kie AI `/api/v1/jobs/createTask` with model routing logic (sora2 vs sora2-pro, text-to-video vs image-to-video)
- Polling: `/api/v1/jobs/recordInfo` checking `data.state === "success"`
- Output schema per scene: task_id, Title, Caption, Prompt, aspect_ratio, image_reference, model
- Social publishing integration notes (Blotato pattern for future reference)

**2. Create `docs/pipelines/PRODUCT_VIDEOGRAPHY_PIPELINE.md`**
- Pipeline flow: Webhook → Get Project → Switch (Prompt/Image/Video phase) → phase-specific processing → Log → Re-trigger
- Three-phase re-entrant state machine pattern
- Phase 1: Gemini 3 Pro vision analysis → AI Agent (cinematic cinematography prompt generator) → outputs starting_image_prompt (YAML), ending_image_prompt, transition_prompt
- Phase 2: WaveSpeed AI nano-banana-pro/edit for start frame → end frame generation from start frame
- Phase 3: Kie AI Veo3 with `generationType: FIRST_AND_LAST_FRAMES_2_VIDEO` using both start and end frame images
- Inputs: Image 1, Image 2, Creative Direction, aspect_ratio (9:16 or 16:9)
- AI Agent system prompt: Cinematic Product Videography Generator with detailed YAML structure
- Provider details: WaveSpeed AI (sync mode, 2K resolution, PNG output)

**3. Update `docs/pipelines/UGC_VIDEO_PIPELINE.md`**
- Add Variant C section documenting the "Infinite UGCs" workflow
- Key difference from Variant B: uses Kie AI (`/api/v1/gpt4o-image/generate`) for image generation instead of Fal AI nano-banana
- Image polling uses `successFlag === 1` check (same as video polling)
- Otherwise identical architecture to Variant B

**4. Update `BRANDFLOW_PLAN.md`**
- Update the generation families section with confirmed pipeline details
- Add provider matrix showing which APIs each family uses

### Provider Matrix (for reference)

```text
Pipeline              | Image Gen          | Video Gen              | Vision Analysis
─────────────────────────────────────────────────────────────────────────────────────
UGC Video (A)         | Kie AI gpt4o-image | Kie AI Veo3/Veo3_fast  | OpenAI GPT-4o
UGC Video (B)         | Fal AI nano-banana | Kie AI Veo3/Veo3_fast  | OpenAI GPT-4o
UGC Video (C)         | Kie AI gpt4o-image | Kie AI Veo3/Veo3_fast  | OpenAI GPT-4o
AI Spokesperson       | (none — optional)  | Kie AI Sora2/Sora2-Pro | OpenAI GPT-4o
Product Videography   | WaveSpeed nano-ban | Kie AI Veo3_fast       | Gemini 3 Pro
```

### Brandflow Adaptation Notes (per pipeline)

**AI Spokesperson**: Replace Google Sheets state store with Supabase `jobs` + `job_stages`. Replace schedule triggers with on-demand web UI trigger. Cameo feature maps to brand avatar/spokesperson asset. Social publishing via Blotato pattern is future work — MVP uses "mark as published."

**Product Videography**: Replace Airtable state store with Supabase. Replace webhook re-entry with job stage state machine. WaveSpeed API needs to be added to provider abstraction (or route through Seedream 5 Lite A/B test). The `FIRST_AND_LAST_FRAMES_2_VIDEO` generation type is unique to this pipeline and must be supported in the Kie AI adapter.

**Social Content Batch (Variant C)**: Nearly identical to Variant B — use as the Kie AI image generation path in the A/B provider test.

### Decision Point

The file labeled "Social Content Batch" (04) is actually another UGC video workflow, not a text+image social content generator. This means we still need to design the **Social Content Batch** pipeline (static images + captions for social posts) from scratch, unless you have another workflow for that.

