# Product Videography Pipeline — Technical Reference

> Reverse-engineered from production n8n workflow: `n30 | Product Videography (by RoboNuggets)`

---

## Overview

Generates cinematic product showcase videos using a start-frame → end-frame → transition video approach. The system creates two high-quality product images (start and end frames) using WaveSpeed's nano-banana-pro model, then generates a smooth cinematic transition video between them using Kie AI's Veo3 with `FIRST_AND_LAST_FRAMES_2_VIDEO` generation type.

**Core principle**: Create premium product videography by defining the first and last frames of a cinematic camera move, then letting AI generate the smooth transition between them.

---

## Pipeline Stages

```text
Webhook Trigger → Get Project (Airtable) → Switch (resume point)
  → [Prompt lane] Analyze Image (Gemini 3 Pro) → AI Agent (scene prompts) → Log Prompts
  → [Image lane] Start Frame (WaveSpeed 🍌) + End Frame (WaveSpeed 🍌) → Log Images
  → [Video lane] Create Video (Kie AI Veo3, FIRST_AND_LAST_FRAMES_2_VIDEO) → Poll → Log Video
```

---

## Re-entrant State Machine

The workflow uses a **Switch node** to determine which stage to resume at, based on what data already exists in the project record:

| Condition | Route | Action |
|-----------|-------|--------|
| `Creative Direction` exists, `start_image_prompt` missing | **Prompt** | Generate prompts via AI Agent |
| `start_image_prompt` exists, `start_image` URL missing | **Image** | Generate start/end frame images |
| `start_image` URL exists | **Video** | Generate transition video |

This allows the workflow to be re-triggered at any stage (e.g., after manual prompt editing).

---

## Stage 1: Brief Intake

**Source**: Airtable project record (Brandflow: web UI form)

**Inputs**:
| Field | Type | Required | Example |
|-------|------|----------|---------|
| `Project Name` | string | Yes | "Luxury Watch Showcase" |
| `Image 1` | URL (attachment) | Yes | Product photo |
| `Image 2` | URL (attachment) | No | Additional angle |
| `Creative Direction` | string | Yes | "Macro cinematic shot, moody lighting, slow dolly" |
| `aspect_ratio` | enum: `9:16` \| `16:9` | Yes | `16:9` |
| `Core Image` | URL (attachment) | Yes | Primary product reference for nano-banana-pro |
| `Core Elements` | URL (attachment) | No | Elements board for compositing context |

---

## Stage 2: Analyze Reference Image

**Purpose**: Describe the product image in detail so the AI agent has textual context.

**Provider**: Google Gemini 3 Pro (vision)

**Prompt**:
```
Please look at this image and describe it in detail. What is shown in the
character section, the setting section, and the product section? Explain what
you see in each part so the image can be fully translated into text.
```

**Output**: Detailed text description of the product image contents.

---

## Stage 3: Scene Planning (AI Agent)

**Purpose**: Generate precisely structured prompts for start image, end image, and transition video.

**Provider**: OpenRouter (model configurable) + Think Tool + Structured Output Parser

**System Prompt** (AGENT framework, condensed):
```
## 🎥 SYSTEM PROMPT: Cinematic Product Videography Generator

A – Ask:
  Generate highly cinematic product videography prompts.
  Output:
    - One starting_image_prompt (YAML block with 8 required fields)
    - One ending_image_prompt (string: Prompt + Camera)
    - One transition_prompt (string: Camera + Movement + Action)

G – Guidance:
  role: High-end commercial cinematographer and macro product visual director
  output_count: 1
  constraints:
    - Only ONE scene is returned
    - No scripts or music prompts

  🖼️ Starting Image Prompt (YAML format):
    Required keys:
      Composition, Lighting, Environment, Action,
      Refinements, Camera, Aesthetic, Mood
    Tone: high-end cinematic macro product photography
    Visual emphasis: material fidelity, studio-grade lighting, premium cinematography

  🎯 Ending Image Prompt:
    - One string with two keys: Prompt + Camera
    - Very short (1-2 sentences)
    - Describes ONLY the change in framing/FOV
    - Product must remain UNCHANGED
    - Must NOT describe camera movement or dramatic actions

  🎞️ Transition Prompt:
    - One string with three keys: Camera + Movement + Action
    - Use ONLY cinematic camera terminology (dolly-in, linear dolly, slow push, macro drift)
    - Emphasize slowness and precision
    - Product remains static
```

**Output Schema**:
```json
{
  "scene": "Scene 1 - [Title]",
  "starting_image_prompt": "Composition: ...\nLighting: ...\nEnvironment: ...\nAction: ...\nRefinements: ultra_fine_skin_texture, ...\nCamera: 35mm wide-angle, ...\nAesthetic: photorealistic, cinematic\nMood: ...",
  "ending_image_prompt": "Prompt: ...\nCamera: ...",
  "transition_prompt": "Camera: ...\nMovement: ...\nAction: ..."
}
```

---

## Stage 4: Image Generation (Start + End Frames)

**Purpose**: Generate two product images — the starting frame and ending frame of the cinematic transition.

**Provider**: WaveSpeed AI (`nano-banana-pro/edit`) — synchronous mode

### Start Frame

**Request**:
```json
POST https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit
{
  "aspect_ratio": "16:9",
  "enable_base64_output": false,
  "enable_sync_mode": true,
  "output_format": "png",
  "prompt": "<starting_image_prompt>",
  "resolution": "2k",
  "images": ["<core_image_url>", "<core_elements_url>"]
}
```

**Authentication**: API key via HTTP header (`Authorization: Bearer <WAVESPEED_API_KEY>`)

**Response** (sync mode): `data.outputs[0]` contains the generated image URL directly (no polling needed).

### End Frame

**Request**:
```json
POST https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit
{
  "aspect_ratio": "16:9",
  "enable_base64_output": false,
  "enable_sync_mode": true,
  "output_format": "png",
  "prompt": "<ending_image_prompt>",
  "resolution": "2k",
  "images": ["<start_frame_output_url>"]
}
```

**Key detail**: The end frame uses the **generated start frame** as its input image (not the original product photo). This ensures visual continuity.

**Batching**: Both requests use batch size 1 with 2-second intervals.

---

## Stage 5: Video Generation (Transition)

**Purpose**: Generate a smooth cinematic transition video between the start and end frames.

**Provider**: Kie AI Veo3 (`/api/v1/veo/generate`) with special `FIRST_AND_LAST_FRAMES_2_VIDEO` generation type

**Request**:
```json
POST https://api.kie.ai/api/v1/veo/generate
{
  "prompt": "<transition_prompt>",
  "model": "veo3_fast",
  "aspectRatio": "<aspect_ratio>",
  "enableTranslation": false,
  "generationType": "FIRST_AND_LAST_FRAMES_2_VIDEO",
  "imageUrls": ["<start_frame_url>", "<end_frame_url>"]
}
```

**Critical fields**:
- `generationType: "FIRST_AND_LAST_FRAMES_2_VIDEO"` — tells Veo3 to generate video transitioning FROM the first image TO the second image
- `imageUrls` array must contain exactly 2 URLs: `[start_frame, end_frame]`
- `enableTranslation: false` — keeps prompt as-is

**Polling**: Same as standard Veo3:
- GET `https://api.kie.ai/api/v1/veo/record-info?taskId=<taskId>`
- Check `data.successFlag === 1`
- Result at `data.response.resultUrls[0]`

---

## Provider Summary

| Stage | Provider | API Endpoint | Auth |
|-------|----------|-------------|------|
| Analyze Image | Google Gemini 3 Pro | Gemini API (vision) | API key |
| Scene Planning | OpenRouter (configurable) | OpenRouter API | API key |
| Start Frame | WaveSpeed AI | `api.wavespeed.ai/api/v3/google/nano-banana-pro/edit` | HTTP header |
| End Frame | WaveSpeed AI | `api.wavespeed.ai/api/v3/google/nano-banana-pro/edit` | HTTP header |
| Video Generation | Kie AI (Veo3) | `api.kie.ai/api/v1/veo/generate` | HTTP header |
| Video Polling | Kie AI | `api.kie.ai/api/v1/veo/record-info` | HTTP header |

---

## Key Design Notes

1. **Three-prompt architecture**: start image → end image → transition video. This gives precise control over the cinematic camera move.
2. **End frame derives from start frame**: The end frame image is generated using the start frame as input, ensuring visual continuity.
3. **FIRST_AND_LAST_FRAMES_2_VIDEO** is a special Kie AI/Veo3 generation type not used in any other pipeline family.
4. **WaveSpeed sync mode**: Unlike Fal AI's queue-based async, WaveSpeed returns results directly (no polling for images).
5. **Single scene only**: Unlike UGC/Spokesperson pipelines, this generates exactly ONE scene per job.
6. **Re-entrant design**: The Switch node allows manual intervention between stages (edit prompts before generating images, edit images before generating video).

---

## Brandflow Implementation Notes

1. **Replace Airtable** with Supabase tables and `job_stages` tracking
2. **Re-entrant state machine** maps perfectly to `job_stages` with status tracking — each stage can be paused for user review
3. **WaveSpeed nano-banana-pro** is used for image generation (not Kie AI or Fal AI) — the provider adapter must support WaveSpeed's sync API pattern
4. **The `FIRST_AND_LAST_FRAMES_2_VIDEO` generation type** must be explicitly supported in the Kie AI Veo adapter
5. **Core Elements Board** (Family 6) feeds into this pipeline — the `Core Elements` attachment is the brand board generated by that pipeline
6. **A/B testing opportunity**: Test Seedream 5 Lite vs nano-banana-pro for start/end frame generation quality

---

## Enterprise Engine Integration

> Applied from Cross-Family Engine Audit — standardizes this pipeline with enterprise-grade shared modules.

### 1. Asset Analyzer (replaces Stage 2)

Switch from Gemini free-text to the unified `AnalyzeAsset` Edge Function:
- **Mode**: `product` (primary — product showcase pipeline)
- **Provider**: Gemini via Lovable AI Gateway (already uses Gemini, just standardize output format)
- **Output**: Structured YAML instead of free-text description
- Standardizes output format for downstream agent consumption

### 2. Creative Director Agent (upgrades Stage 3)

Stage 3 already uses the AGENT framework — enhancements:
- **Think Tool**: Ensure mandatory reasoning pass is present (verify in prompt)
- **Structured creative summary**: Include start/end frame descriptions, transition plan, cost estimate
- No major changes needed — F3 is already well-structured

### 3. Plan Review Gate (new Stage 3.5)

Mandatory checkpoint between planning and generation:
- User sees: start frame description, end frame description, transition plan, estimated cost
- Visual preview: Text descriptions of how the cinematic camera move will look
- Actions: Approve / Reject / Edit prompts
- Single-scene pipeline so review is fast and focused

### 4. Revision Loop (new Stage 3.6)

When user rejects the plan:
- **RevisionAgent** receives: original creative direction + original prompts + user comments
- Generates revised start/end/transition prompts incorporating feedback
- Re-submits to Plan Review Gate
- Preserves cinematic quality standards across revisions

### 5. SEALCaM Adoption

Map existing YAML fields to SEALCaM 6-field standard:

| Current PV YAML Field | SEALCaM Field |
|------------------------|---------------|
| Composition | Subject + Camera |
| Lighting | Lighting |
| Environment | Environment |
| Action | Action |
| Refinements | Metatokens |
| Camera | Camera |
| Aesthetic + Mood | Metatokens (appended) |

- Enables cross-family template compatibility
- Existing prompt quality is maintained — this is a format standardization, not a quality change

### 6. Music Engine (optional, parallel lane)

- Toggle: "Add background music?" in the brief
- If enabled: Suno V5 via Kie AI runs in parallel with video generation
- Single-scene pipeline so music is a simple overlay (no multi-clip sync needed)
- Mood auto-detected from creative direction tone

### 7. Assembly Engine

- Single-scene pipeline — Assembly Engine handles music overlay only (no concatenation needed)
- If music enabled: overlay music at reduced volume (25%) on the transition video
- Provider: Fal AI FFmpeg API (custom command for audio mix)
- Simple assembly: Video + Music overlay → Export

### 8. Re-entry Controller

F3 already has a re-entrant state machine (Switch node) — **document as reference pattern**:
- Checks: `Creative Direction` exists → `start_image_prompt` exists → `start_image` URL exists
- Resume from appropriate stage based on existing data
- This pattern should be adopted by all other families
- Brandflow: Map to `job_stages` status tracking

### 9. Provider & Tier Routing

| Tier | Image Model | Video Model | Use Case |
|------|-------------|-------------|----------|
| **Draft** | nano-banana-pro (standard) | BytePlus Seedance 1.0 Lite | Fast iteration, first drafts |
| **Production** | nano-banana-pro (2k) / SeedEdit 3.0 | BytePlus Seedance 1.0 | Approved finals, high quality |

**Video provider chain (F3-specific)**:
1. BytePlus Seedance 1.0 (primary — keyframe-driven, ideal for start→end frame transitions)
2. Kie AI Veo3 `FIRST_AND_LAST_FRAMES_2_VIDEO` (fallback — current provider)
3. Runway Gen-4 (emergency)

**Image provider chain**:
1. WaveSpeed nano-banana-pro (primary)
2. BytePlus SeedEdit 3.0 / Seedream 5.0 (fallback — strong for product compositing)
3. OpenAI DALL-E 3 (emergency)

- Auto-selects Draft before Plan Review Gate
- Switches to Production after approval
- Resolution upgrade (standard → 2k) for production tier images

### 10. Core Elements Board Injection

- Core Elements Board (F6) already connected to this pipeline via `Core Elements` input
- Standardize: auto-pull from brand assets if available
- If brand has no Core Elements Board → pipeline works without it (already optional)
