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
