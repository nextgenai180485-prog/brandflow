# UGC Video Pipeline — Technical Reference

> Reverse-engineered from production n8n workflow: `R38 _ AI UGC Ads Factory`

---

## Overview

Takes a reference image (product/brand) and generates UGC-style (User-Generated Content) video ads that look like casual, authentic creator content — not polished commercials.

**Core principle**: Make ads that feel like real people filmed them on their iPhone.

---

## Pipeline Stages

```text
Brief Intake → Analyze Image → Scene Planning (AI Agent) → Split Scenes
   → [per scene] Image Generation → Poll → Video Generation → Poll → Download → Store
```

---

## Stage 0: Creative Direction (Module #23)

**Mandatory first stage** — transforms business inputs (brand, product, audience, platform) into a strategic creative brief before scene planning. For F1 UGC, this stage applies authenticity-biased angle selection, casual hook styles, and single-character framing. Output feeds into the Plan Review Gate for user approval. See `engines/CREATIVE_DIRECTION_ENGINE.md`.

---

## Stage 1: Brief Intake

**Purpose**: Collect all user inputs needed for generation.

**Inputs**:
| Field | Type | Required | Example |
|-------|------|----------|---------|
| `reference_image_url` | URL (Google Drive or direct) | Yes | GDrive share link |
| `video_count` | integer | Yes (default: 1) | 3 |
| `dialogue` | string | No (AI generates if empty) | "So TikTok made me buy this..." |
| `model` | enum: `veo3` \| `veo3_fast` | Yes (default: `veo3_fast`) | `veo3_fast` |
| `aspect_ratio` | enum: `vertical` \| `horizontal` | Yes (default: `vertical`) | `vertical` |
| `special_requests` | string | No | "Diversity in actors, ages 21-29, casual settings" |

**Output**: Structured brief object passed to all downstream stages.

---

## Stage 2: Analyze Reference Image

**Purpose**: Extract brand/product visual identity from the reference image using vision AI.

**Provider**: OpenAI GPT-4o (vision)

**Input**: Reference image URL

**Prompt**:
```
Return the analysis in YAML format with the following fields:

brand_name: (Name of the brand shown in the image, if visible or inferable)
color_scheme:
  - hex: (Hex code of each prominent color used)
    name: (Descriptive name of the color)
font_style: (Describe the font family or style used: serif/sans-serif, bold/thin, etc.)
visual_description: (A full sentence or two summarizing what is seen in the image, ignoring the background)

Only return the YAML. Do not explain or add any other comments.
```

**Output**: YAML string with brand_name, color_scheme, font_style, visual_description

**Provider alternatives**: Gemini 2.5 Pro (has strong vision capabilities)

---

## Stage 3: Scene Planning (AI Agent)

**Purpose**: Generate structured image and video prompts for each scene, enforcing UGC aesthetic.

**Provider**: OpenAI GPT-4.1 with Think tool + Structured Output Parser

**Inputs**:
- Image analysis YAML from Stage 2
- Full brief from Stage 1 (video count, dialogue, model, aspect ratio, special requests)

**System Prompt** (condensed):
```
You are a UGC (User-Generated Content) AI agent.
Take the reference image/product and place it into realistic, casual scenes
as if captured by everyday content creators or influencers.

UGC style rules:
- Everyday realism with authentic, relatable settings
- Amateur-quality iPhone photo/video style
- Slightly imperfect framing and lighting
- Candid poses and genuine expressions
- Visible imperfections (blemishes, messy hair, uneven skin)
- Real-world environments left as-is (clutter, busy backgrounds)

Camera keywords: unremarkable amateur iPhone photos, reddit image, snapchat video,
casual iPhone selfie, slightly uneven framing, authentic share, slightly blurry,
amateur quality phone photo

If dialogue not provided, generate casual conversational line under 200 chars.
Use "..." for pauses. Avoid special characters.

Scene count must EXACTLY match user's requested number.
Default actor age: 21-38. Ensure diversity in gender, ethnicity, hair color.
```

**Output Schema**:
```json
{
  "scenes": [
    {
      "image_prompt": "emotion: [string]\naction: [string]\ncharacter: [string]\nsetting: [string]\ncamera: [string]\nstyle: [string]",
      "video_prompt": "dialogue: [string]\nemotion: [string]\nvoice_type: [string]\naction: [string]\ncharacter: [string]\nsetting: [string]\ncamera: [string]",
      "aspect_ratio_video": "9:16 | 16:9",
      "aspect_ratio_image": "3:2 | 2:3",
      "model": "veo3 | veo3_fast"
    }
  ]
}
```

**Mapping rules**:
- `vertical` → `aspect_ratio_video: "9:16"`, `aspect_ratio_image: "2:3"`
- `horizontal` → `aspect_ratio_video: "16:9"`, `aspect_ratio_image: "3:2"`

**Provider alternatives**: Gemini 2.5 Pro (structured output supported)

---

## Stage 4: Split Scenes

**Purpose**: Fan out the scenes array so each scene is processed independently (parallel execution).

**Input**: `output.scenes` array from Stage 3  
**Output**: Individual scene objects, each flowing through Stages 5-8 independently

---

## Stage 5: Image Generation (per scene)

**Purpose**: Generate a reference frame/start image for each scene using the product image + scene prompt.

**Provider**: Kie AI (`/api/v1/gpt4o-image/generate`)

**Request**:
```json
{
  "filesUrl": ["<reference_image_url>"],
  "prompt": "<scene.image_prompt>",
  "size": "<scene.aspect_ratio_image>",
  "nVariants": 1
}
```

**Authentication**: API key via HTTP header

**Response**: Returns `taskId` for async polling.

**Polling** (Stage 5b):
- Wait ~300 seconds (5 minutes)
- GET `/api/v1/gpt4o-image/record-info?taskId=<taskId>`
- Check `data.successFlag === 1`
- If not ready → wait again and re-poll
- If ready → `data.response.resultUrls[0]` contains the generated image URL

---

## Stage 6: Video Generation (per scene)

**Purpose**: Generate UGC-style video from the generated image + video prompt.

**Provider**: Kie AI (`/api/v1/veo/generate`) — routes to Google Veo3/Veo3_fast

**Request**:
```json
{
  "prompt": "<scene.video_prompt>",
  "model": "<scene.model>",
  "aspectRatio": "<scene.aspect_ratio_video>",
  "imageUrls": "<generated_image_url_from_stage_5>"
}
```

**Authentication**: API key via HTTP header

**Response**: Returns `taskId` for async polling.

**Polling** (Stage 6b):
- Wait ~600 seconds (10 minutes)
- GET `/api/v1/veo/record-info?taskId=<taskId>`
- Check `data.successFlag === 1`
- If not ready → wait again and re-poll
- If ready → `data.response.resultUrls[0]` contains the video URL

---

## Stage 7: Download Video

**Purpose**: Fetch the final video file from the result URL.

**Input**: `data.response.resultUrls[0]` from Stage 6  
**Output**: Binary video file (MP4)

---

## Stage 8: Store Artifact

**Purpose**: Persist the generated video to storage.

**Original provider**: Box (cloud storage)  
**Brandflow replacement**: Supabase Storage

**File naming**: `<taskId>.mp4`

---

## Provider Summary

| Stage | Provider | API Endpoint | Auth |
|-------|----------|-------------|------|
| Analyze Image | OpenAI GPT-4o | OpenAI API (vision) | API key |
| Scene Planning | OpenAI GPT-4.1 | OpenAI API (chat) | API key |
| Image Generation | Kie AI | `api.kie.ai/api/v1/gpt4o-image/generate` | HTTP header |
| Image Polling | Kie AI | `api.kie.ai/api/v1/gpt4o-image/record-info` | HTTP header |
| Video Generation | Kie AI (Veo3) | `api.kie.ai/api/v1/veo/generate` | HTTP header |
| Video Polling | Kie AI | `api.kie.ai/api/v1/veo/record-info` | HTTP header |
| Storage | Supabase Storage | Supabase SDK | Service role |

---

## Async Execution Pattern

Both image and video generation use the same async pattern:

```text
POST /generate → returns taskId
   ↓
WAIT (image: 5min, video: 10min)
   ↓
GET /record-info?taskId=<id>
   ↓
IF successFlag === 1 → proceed with resultUrls[0]
IF successFlag !== 1 → loop back to WAIT
```

**Brandflow implementation**: This maps to `job_stages` with status tracking:
- `pending` → task created
- `running` → generate API called, taskId stored in `output` jsonb
- `polling` → waiting for completion (can use DB-based polling or webhook)
- `done` → result URL stored as artifact
- `error` → max retries exceeded or API error

---

## Batching & Rate Limits

The n8n workflow uses batching with intervals:
- Image generation: batch size 1, 3-second interval between requests
- Video generation: batch size 1, 3-second interval between requests

**Brandflow must respect these** to avoid Kie AI rate limits.

---

## Key Design Notes

1. **Reference image is passed to BOTH analysis AND image generation** — the product must appear accurately in generated images
2. **The system prompt is the secret sauce** — UGC aesthetic is enforced via detailed prompt engineering, not model selection
3. **Dialogue style**: Casual, conversational, under 200 chars, uses "..." for pauses
4. **Diversity is explicitly required**: gender, ethnicity, hair color, settings
5. **No post-processing/merge stage** in this workflow — each scene produces one standalone video
6. **Double quotes are forbidden** in image/video prompts (escaping issue with downstream APIs)

---
---

# UGC Video Pipeline — Variant B: Nanobanana (Multi-Clip Merge)

> Reverse-engineered from production n8n workflow: `Nanobanana UGCs, any length, any character`

---

## Overview

A more advanced UGC pipeline that generates **longer-form videos** by creating multiple 8-second clips and merging them into one seamless video. Key architectural differences from Variant A:

1. **Two separate AI agents** — Image Agent (1 image) + Video Agent (N clips)
2. **Fal AI for image generation** (`fal-ai/nano-banana/edit`) instead of Kie AI
3. **Duration-based scene calculation** — total duration ÷ 8s = number of clips
4. **Clip merging step** — `fal-ai/ffmpeg-api/merge-videos` combines clips into final video
5. **Telegram I/O** — triggered by photo+caption, delivers final video via Telegram

---

## Pipeline Stages

```text
Trigger (Telegram) → Get Image Path → Describe Image (GPT-4o Vision)
  → Image AI Agent (1 prompt) → Create Image (Fal AI) → Poll
  → Video AI Agent (N prompts) → Split Scenes
  → [per scene] Create Video (Kie AI Veo) → Poll
  → Aggregate URLs → Combine Clips (Fal AI FFmpeg) → Poll → Deliver
```

---

## Stage 1: Trigger & Image Retrieval

**Source**: Telegram message with photo + caption (user instructions)

**Steps**:
1. Telegram Trigger receives photo + caption
2. Extract bot token from config
3. Call Telegram `getFile` API to get the image file path
4. Download reference image via `https://api.telegram.org/file/bot<token>/<file_path>`

**Brandflow adaptation**: Replace Telegram trigger with web UI upload. The reference image comes from Supabase Storage instead.

---

## Stage 2: Describe Reference Image

**Purpose**: Analyze whether the image contains a product, a character, or both — and extract visual details.

**Provider**: OpenAI GPT-4o (vision)

**Prompt** (handles both product and character images):
```
Analyze the given image and determine if it primarily depicts a product or a character, or BOTH.

- If product:
  brand_name, color_scheme (hex + name), font_style, visual_description

- If character:
  character_name, color_scheme (hex + name), outfit_style, visual_description

- If BOTH: return both descriptions

Only return YAML. No explanations.
```

**Key difference from Variant A**: This analyzer handles characters AND products, not just products.

---

## Stage 3A: Image AI Agent (Single Image)

**Purpose**: Generate ONE image prompt to create a base frame with the product/character in a UGC scene.

**Provider**: OpenAI GPT-4.1 + Structured Output Parser

**System prompt** (condensed):
```
Default: Put this (product) into the scene with the (character).
If user wants UGC: use casual UGC-style scenes.
If user specifies a different style: follow their instructions.

UGC style rules: (same as Variant A)
- Amateur iPhone photos, candid, imperfections
- Preserve all visible product TEXT accurately
- Camera: amateur iPhone photo, casual selfie, uneven framing

Only image prompts. No video/dialogue generation.
```

**Output Schema**:
```json
{
  "image_prompt": "action: ...\ncharacter: ...\nproduct: ...\nsetting: ...\ncamera: ...\nstyle: ...\ntext_accuracy: ...",
  "aspect_ratio_image": "2:3 | 3:2"
}
```

---

## Stage 4: Image Generation (Fal AI)

**Purpose**: Generate the base image using Fal AI's Nanobanana model (image editing/compositing).

**Provider**: Fal AI (`fal-ai/nano-banana/edit`) — async queue API

**Request**:
```json
POST https://queue.fal.run/fal-ai/nano-banana/edit
{
  "prompt": "<image_prompt>",
  "image_urls": ["<reference_image_url>"]
}
```

**Authentication**: API key via HTTP header (`Authorization: Key <FAL_API_KEY>`)

**Response**: Returns `response_url` for async polling (queue-based, not taskId-based).

**Polling**:
- Wait ~30 seconds
- GET `<response_url>` with same auth header
- Check if `images[0].url` is not empty
- If not ready → wait 30s and re-poll
- If ready → `images[0].url` contains the generated image

**Key difference from Variant A**: Fal AI uses a queue URL pattern (`response_url`) instead of Kie AI's `taskId` pattern.

---

## Stage 3B: Video AI Agent (Multiple Clips)

**Purpose**: Generate N video prompts based on desired total duration. Runs AFTER the image is generated.

**Provider**: OpenAI GPT-4.1 + Structured Output Parser

**Scene count logic**:
- User specifies total video duration (e.g., "30 seconds")
- Each clip = 8 seconds
- Scene count = ceil(total_duration / 8)
- If not specified, default to 3 scenes

**System prompt** (condensed):
```
UGC-Style Veo3/Veo3_fast Prompt Generator (Video-Only)

Same UGC style rules as Variant A.

Dialogue: If not provided, generate casual conversational line under 150 chars.
Use ... for pauses. No special characters.

For each scene, have the character talk about the product naturally.
Only mention brand name in the FIRST scene.
Unless stated, do NOT have character open/eat/use the product — just show it.

Dialogue must run continuously across scenes and make sense as a whole.
```

**Output Schema**:
```json
{
  "scenes": [
    {
      "video_prompt": "dialogue: ...\naction: ...\ncamera: ...\nemotion: ...\nvoice_type: ...\ncharacter: ...\nsetting: ...",
      "aspect_ratio_video": "9:16 | 16:9",
      "model": "veo3 | veo3_fast"
    }
  ]
}
```

**Key differences from Variant A**:
- No `image_prompt` per scene (single shared image)
- Dialogue is continuous across scenes (narrative coherence)
- 150-char dialogue limit (vs 200 in Variant A)

---

## Stage 5: Video Generation (per clip)

**Provider**: Kie AI (`/api/v1/veo/generate`) — same as Variant A

**Request**:
```json
{
  "prompt": "<scene.video_prompt>",
  "model": "<scene.model>",
  "aspectRatio": "<scene.aspect_ratio_video>",
  "imageUrls": "<generated_image_url_from_stage_4>"
}
```

**Note**: ALL clips use the SAME base image from Stage 4 (not per-scene images like Variant A).

**Polling**: Same as Variant A — wait ~450s, check `successFlag === 1`, get `resultUrls[0]`.

---

## Stage 6: Aggregate & Combine Clips

**Purpose**: Collect all individual clip URLs and merge them into one seamless video.

**Step 6a — Aggregate**: Collect `data.response.resultUrls[0]` from all completed clips into a single array.

**Step 6b — Combine Clips**:

**Provider**: Fal AI (`fal-ai/ffmpeg-api/merge-videos`) — async queue API

**Request**:
```json
POST https://queue.fal.run/fal-ai/ffmpeg-api/merge-videos
{
  "video_urls": ["<clip1_url>", "<clip2_url>", "<clip3_url>"]
}
```

**Polling**:
- Wait ~60 seconds
- GET `<response_url>` with auth header
- Check if `video.url` is not empty
- If not ready → wait 60s and re-poll
- If ready → `video.url` contains the final merged video

---

## Stage 7: Deliver

**Original**: Send final video back via Telegram bot
**Brandflow**: Store in Supabase Storage, create artifact record, notify user via UI

---

## Provider Summary (Variant B)

| Stage | Provider | API Endpoint | Auth |
|-------|----------|-------------|------|
| Describe Image | OpenAI GPT-4o | OpenAI API (vision) | API key |
| Image Agent | OpenAI GPT-4.1 | OpenAI API (chat) | API key |
| Video Agent | OpenAI GPT-4.1 | OpenAI API (chat) | API key |
| Image Generation | Fal AI | `queue.fal.run/fal-ai/nano-banana/edit` | API key (header) |
| Image Polling | Fal AI | `<response_url>` | API key (header) |
| Video Generation | Kie AI (Veo3) | `api.kie.ai/api/v1/veo/generate` | HTTP header |
| Video Polling | Kie AI | `api.kie.ai/api/v1/veo/record-info` | HTTP header |
| Clip Merging | Fal AI | `queue.fal.run/fal-ai/ffmpeg-api/merge-videos` | API key (header) |
| Merge Polling | Fal AI | `<response_url>` | API key (header) |

---

## Key Architectural Differences: Variant A vs Variant B

| Aspect | Variant A (Ads Factory) | Variant B (Nanobanana) |
|--------|------------------------|----------------------|
| Trigger | Manual / API | Telegram (→ Web UI) |
| Image per scene | Yes (unique per scene) | No (single shared image) |
| Image provider | Kie AI | Fal AI (nano-banana) |
| AI agents | 1 combined agent | 2 separate agents (image + video) |
| Dialogue style | Per-scene, independent | Continuous narrative across scenes |
| Clip merging | None (standalone clips) | Yes (FFmpeg via Fal AI) |
| Output | Individual clip files | Single merged video |
| Duration control | By video count | By total seconds ÷ 8s per clip |

---

## Brandflow Implementation Notes

1. **Both variants should be selectable** — user picks "Individual Clips" vs "Merged Video" in the brief
2. **Provider abstraction** must support both Kie AI (taskId polling) and Fal AI (queue URL polling) patterns
3. **The single-image approach (Variant B) is cheaper** — one image generation call regardless of clip count
4. **Clip merging adds ~60s+ to total pipeline time** — factor into user-facing time estimates
5. **Narrative coherence** across clips is a key differentiator — the dialogue must flow naturally when clips are stitched together

---

## Enterprise Engine Integration

> Applied from Cross-Family Engine Audit — standardizes this pipeline with enterprise-grade shared modules.

### 1. Asset Analyzer (replaces Stage 2)

Switch from GPT-4o to the unified `AnalyzeAsset` Edge Function:
- **Mode**: `product` (product-only images) or `character` (if image contains a person)
- **Provider**: Gemini via Lovable AI Gateway (standardized across all families)
- **Output**: Structured YAML with brand_name, color_scheme, font_style, visual_description
- Eliminates provider inconsistency (was GPT-4o, now matches F3/F5/F8 on Gemini)

### 2. Creative Director Agent (upgrades Stage 3)

Upgrade scene planning to full AGENT framework:
- **Think Tool**: Mandatory reasoning pass before generating prompts
- **Structured creative summary**: Scene mood, estimated generation time, cost tier
- **AGENT structure**: Ask → Guidance → Examples → Notation → Tools
- Variant A and Variant B both adopt this — the system prompt differences remain (per-scene vs continuous narrative)

### 3. Plan Review Gate (new Stage 3.5)

Mandatory checkpoint between planning and generation:
- User sees: scene count, mood/style per scene, estimated cost, generation time
- Actions: Approve / Reject / Edit individual prompts
- On approval → proceed to image generation
- On rejection → route to Revision Agent

### 4. Revision Loop (new Stage 3.6)

When user rejects the plan:
- **RevisionAgent** receives: original brief + original AI output + user rejection comments
- Generates revised prompts incorporating feedback
- Re-submits to Plan Review Gate (loops until approved or abandoned)
- Preserves conversation history across revision cycles

### 5. Core Elements Board Injection

- Core Elements Board image (from F6) injected as visual reference during image generation
- Ensures product placement consistency across scenes
- If brand has no Core Elements Board → skip (optional enhancement)

### 6. Music Engine (optional, parallel lane)

- Toggle: "Add background music?" in the brief
- If enabled: Suno V5 via Kie AI runs in parallel with video generation
- Mood auto-detected from brand profile or user-specified
- Music added via Assembly Engine after video generation completes

### 7. Assembly Engine

- **Variant A**: Optional — if music is enabled, overlay music on individual clips
- **Variant B**: Enhanced — clip merge (existing) + music overlay + fade transitions
- Provider: Fal AI FFmpeg API (`fal-ai/ffmpeg-api/merge-videos` for concat, custom FFmpeg for audio mix)
- Assembly sequence: Concat clips → Mix music (25% volume) → Export with aspect ratio enforcement

### 8. Re-entry Controller

Resume from any stage via `job_stages` status check:
- `brief_intake` → `asset_analysis` → `scene_planning` → `plan_review` → `image_generation` → `video_generation` → `assembly` → `delivery`
- If a stage fails, retry from that stage without restarting
- If user edits prompts after approval, re-run only downstream stages (image + video)

### 9. Tier Router

| Tier | Image Model | Video Model | Use Case |
|------|-------------|-------------|----------|
| **Draft** | nano-banana (standard) | `veo3_fast` | First pass, fast iteration |
| **Production** | nano-banana (2k) | `veo3` | Approved finals, high quality |

- Auto-selects Draft before Plan Review Gate
- Switches to Production after user approval
- User can override in brief settings

### 10. SEALCaM Prompting

- **Recommended but not mandatory** for UGC family
- UGC aesthetic intentionally conflicts with cinematic structure (amateur vs polished)
- Available as opt-in for users who want "premium UGC" style
- When enabled, maps: action→Action, character→Subject, setting→Environment, camera→Camera

### 11. Brand Voice DNA Integration

Inject `voice_signature.json` into Stage 3 scene planning (dialogue generation):
- Prepend `## Brand Voice Context` block to the scene planning agent's system prompt
- Ensures generated dialogue matches brand personality (casual vs professional, emoji usage, vocabulary)
- Critical for maintaining brand differentiation in UGC-style scripts
- See `engines/BRAND_VOICE_DNA_ENGINE.md` for full schema and injection contract

### 12. Character Consistency Integration (Variant B — multi-clip)

For Variant B (merged multi-clip videos) with recurring characters:
- Extract canonical character descriptor from reference image analysis (Stage 2)
- Inject `## Character Consistency — MANDATORY` block into every scene's video prompt
- All clips share the same base image (inherent consistency) but video prompts still need descriptor for Veo3 consistency
- See `engines/CHARACTER_CONSISTENCY_ENGINE.md` for descriptor schema

### 13. UGC Voiceover Extension (optional)

Add optional voice overlay lane running parallel to video generation:
- Script auto-generation from scene descriptions (or user-provided dialogue)
- Voice persona matching to UGC archetype (Young Creator, Expert Friend, Honest Reviewer, Storyteller)
- ElevenLabs TTS generation with UGC-optimized voice settings
- Assembly Engine mixes: voice (100% vol) + music (25% vol), mutes Veo3 audio
- See `engines/UGC_VOICEOVER_EXTENSION.md` for full specification

### 14. Provider Routing

All provider calls route through the Provider Routing Layer:
- Video: Kie AI Veo3 → Runway → Pika (fallback chain)
- Image: Kie AI → Fal AI → OpenAI (fallback chain)
- See `engines/PROVIDER_ROUTING_POLICY.md` for health-check and failover logic

### 15. Delivery & Post-Production (Module #17)

After Assembly, output passes through Module #17 for enterprise-grade finishing:
- **Auto-Subtitles**: ✅ (BytePlus VOD Smart Captioning → Whisper fallback)
- **Dubbing**: opt (user-selected target languages)
- **Audio Polish**: ✅ (loudness normalization -14 LUFS, noise reduction)
- **Video Enhancement**: opt (upscale, color grading)
- **Thumbnails**: ✅ (auto-extracted + brand overlay)
- **Watermark**: ✅ (review versions watermarked, stream-only, 7-day expiry)
- **Export**: ✅ (multi-format, multi-platform presets)
- Review version shown at Plan Review Gate (#2); production version unlocked on approval
- See `engines/DELIVERY_POST_PRODUCTION_ENGINE.md` for full specification
