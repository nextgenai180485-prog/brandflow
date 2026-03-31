# AI Spokesperson Video Pipeline — Technical Reference

> Reverse-engineered from production n8n workflow: `n24 | Autopilot Cameos with Sora2 Pro`

---

## Overview

Generates batch AI spokesperson/cameo videos using Sora2 or Sora2-Pro models via Kie AI. The system takes a master prompt, optional image reference, and optional cameo character — then generates N video scenes as standalone clips.

**Core principle**: Batch-produce talking-head or character-driven video content at scale using AI avatars, with optional image-to-video capability.

---

## Pipeline Stages

```text
Master Prompt (Google Sheets) → Analyze Image (GPT-4o Vision, optional)
  → AI Agent (GPT-4.1, N scenes) → Split Scenes
  → [per scene] Create Sora2 (Kie AI) → Poll → Log Video
  → [optional] Social Distribution (Blotato)
```

---

## Stage 1: Brief Intake (Master Prompt)

**Source**: Google Sheets row (Brandflow: web UI form)

**Inputs**:
| Field | Type | Required | Example |
|-------|------|----------|---------|
| `your_prompt` | string | Yes | "Create 5 videos about skincare tips" |
| `video_count` | integer | Yes | 5 |
| `cameo` | string | No | "@username" (Sora2 character reference) |
| `model` | enum: `sora2` \| `sora2-pro` | Yes (default: `sora2`) | `sora2-pro` |
| `aspect_ratio` | enum: `9:16` \| `16:9` | Yes (default: `9:16`) | `16:9` |
| `master_prompt_reference` | string | No | Full reference prompt to mimic style |
| `image_reference` | URL | No | Image URL for image-to-video mode |

---

## Stage 2: Analyze Reference Image (Optional)

**Purpose**: If an image reference is provided, analyze it to extract product/character visual details.

**Provider**: OpenAI GPT-4o (vision)

**Prompt**:
```
Analyze the given image and determine if it primarily depicts a product or a character, or BOTH.

- If product:
  brand_name, color_scheme (hex + name), font_style, visual_description

- If character:
  character_name, color_scheme (hex + name), outfit_style, visual_description

- If BOTH: return both descriptions

Only return YAML. No explanations.
```

**Output**: YAML string with visual details for the AI agent.

---

## Stage 3: Scene Planning (AI Agent)

**Purpose**: Generate N video scene prompts based on the master prompt, matching its style, tone, and structure.

**Provider**: OpenAI GPT-4.1 + Think Tool + Structured Output Parser + Google Sheets Tool (deduplication)

**System Prompt** (AGENT framework):
```
## SYSTEM PROMPT: Video Scene Prompt Expander 🎬

A – Ask:
  Suggest detailed video prompts based on the user's input – always mimicking
  the format, tone, and structure of a provided master prompt.

G – Guidance:
  role: Visual director or prompt artist
  output_count: As specified by the user
  constraints:
    - Match the style, length, formatting, and cadence of the master prompt
    - Never use copyrighted or trademarked characters, brands, or IP
    - aspect_ratio must be "9:16" or "16:9"
    - If image_reference URL provided, copy it exactly into output
    - Use Sheet tool to AVOID repeated titles, captions, or prompts
    - If cameo provided, include as @mention near top of each prompt
    - model must be "sora2" or "sora2-pro" (default: "sora2")
    - If user says "Use the master prompt directly", output master prompt
      as-is without changes (still generate Title and Caption)

E – Examples:
  Match the sample's sentence rhythm, length, and visual vocabulary.
  Mirror the tone, cinematic intensity, and phrase structure exactly.

T – Tools:
  - Think Tool: Reflect and reason before responding
  - Sheet: Memory sheet to check for duplicate ideas
```

**Output Schema**:
```json
{
  "scenes": [
    {
      "task_id": 1,
      "Title": "Title here",
      "Caption": "Short caption with emoji 😀 #topic1 #topic2",
      "Prompt": "Detailed video prompt with @cameo if applicable",
      "aspect_ratio": "16:9",
      "image_reference": "https://example.com/image.jpg",
      "model": "sora2 or sora2-pro"
    }
  ]
}
```

---

## Stage 4: Split Scenes

**Purpose**: Fan out the scenes array for parallel processing.

**Input**: `output.scenes` array from Stage 3
**Output**: Individual scene objects, each flowing through Stage 5 independently.

---

## Stage 5: Video Generation (per scene)

**Purpose**: Generate video using Kie AI's Sora2/Sora2-Pro models.

**Provider**: Kie AI (`/api/v1/jobs/createTask`)

**Model Selection Logic**:
```
if model === "sora2-pro":
  if image_reference exists → "sora-2-pro-image-to-video"
  else → "sora-2-pro-text-to-video"
else:
  if image_reference exists → "sora-2-image-to-video"
  else → "sora-2-text-to-video"
```

**Request**:
```json
POST https://api.kie.ai/api/v1/jobs/createTask
{
  "model": "<computed model string>",
  "input": {
    "prompt": "<scene.Prompt>",
    "aspect_ratio": "portrait | landscape",
    "image_urls": ["<image_reference>"],  // only if image-to-video
    "remove_watermark": true,
    "n_frames": "10",     // sora2-pro only
    "size": "standard"    // sora2-pro only
  }
}
```

**Authentication**: API key via HTTP header

**Response**: Returns `data.taskId` for polling.

**Polling**:
- GET `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=<taskId>`
- Check `data.successFlag === 1`
- If not ready → wait and re-poll
- If ready → extract video URL from response

**Key differences from UGC pipeline**:
- Uses `/api/v1/jobs/createTask` (not `/api/v1/veo/generate`)
- Uses `/api/v1/jobs/recordInfo` (not `/api/v1/veo/record-info`)
- Model is `sora-2-*` variants (not `veo3`)
- Aspect ratio uses `portrait`/`landscape` strings (not `9:16`/`16:9`)

---

## Stage 6: Logging & Distribution

**Logging**: Each completed video is logged back to Google Sheets with URL, status, and metadata.

**Social Distribution** (optional): Via Blotato API to multiple platforms:
- Instagram, TikTok, Facebook, LinkedIn, Threads, Twitter/X, BlueSky, YouTube

**Brandflow replacement**: Store artifacts in Supabase Storage, log to `job_stages` table, distribute via Brandflow's social publishing module (future).

---

## Provider Summary

| Stage | Provider | API Endpoint | Auth |
|-------|----------|-------------|------|
| Analyze Image | OpenAI GPT-4o | OpenAI API (vision) | API key |
| Scene Planning | OpenAI GPT-4.1 | OpenAI API (chat) | API key |
| Video Generation | Kie AI (Sora2) | `api.kie.ai/api/v1/jobs/createTask` | HTTP header |
| Video Polling | Kie AI | `api.kie.ai/api/v1/jobs/recordInfo` | HTTP header |
| Social Publish | Blotato (→ Brandflow) | Blotato API | API key |

---

## Two-Part Batch Architecture

The n8n workflow uses a two-part scheduled system:

**Part 1** (Prompt Generation):
- Triggered on schedule
- Reads master prompt from Google Sheets
- Runs AI Agent to generate N scene prompts
- Logs prompts back to Sheets

**Part 2** (Video Generation):
- Triggered on separate schedule
- Reads pending prompts from Sheets
- Submits each to Kie AI Sora2
- Polls for completion
- Logs finished videos

**Brandflow adaptation**: Both parts run as a single pipeline job with `job_stages` tracking each step. No schedule triggers needed — the job orchestrator handles sequencing.

---

## Key Design Notes

1. **Master prompt mimicry** is the core feature — the AI agent copies the style/tone of a reference prompt
2. **Cameo system**: Sora2 supports character references via @mentions in prompts
3. **Image-to-video mode**: When an image reference is provided, switches to image-to-video model variant
4. **Sora2-Pro extras**: Adds `n_frames: "10"` and `size: "standard"` parameters
5. **Deduplication**: The Sheet tool prevents the agent from generating duplicate ideas across runs
6. **Aspect ratio mapping**: `9:16` → `portrait`, `16:9` → `landscape` (different from Veo3 which uses raw ratios)

---

## Brandflow Implementation Notes

1. **Replace Google Sheets** with Supabase tables for input/output tracking
2. **Replace Blotato** with Brandflow's social publishing module
3. **The two-part batch pattern** maps naturally to `job_stages`: Stage 1 = prompt generation, Stage 2 = video generation
4. **Sora2 API uses different endpoints** than Veo3 — the provider adapter must handle both `/api/v1/jobs/*` and `/api/v1/veo/*` patterns
5. **Cameo/character references** should be stored as brand assets that users can select in the brief form

---

## Enterprise Engine Integration

> Applied from Cross-Family Engine Audit — standardizes this pipeline with enterprise-grade shared modules.

### 1. Asset Analyzer (replaces Stage 2)

Switch from GPT-4o to the unified `AnalyzeAsset` Edge Function:
- **Mode**: `character` (primary — spokesperson images) or `product` (if product image provided)
- **Provider**: Gemini via Lovable AI Gateway
- **Output**: Structured YAML with character/product details
- Standardizes vision analysis across all families

### 2. Creative Director Agent (upgrades Stage 3)

Stage 3 already uses the AGENT framework — enhancements:
- **Think Tool**: Add mandatory reasoning pass (reflect before generating prompts)
- **Structured creative summary**: Include mood, style, cameo usage, estimated cost
- **Deduplication**: Retain Sheet tool pattern but migrate to Supabase query

### 3. Plan Review Gate (new Stage 3.5)

Mandatory checkpoint between planning and generation:
- User sees: planned scenes, cameo character, visual style, estimated cost
- Actions: Approve / Reject / Edit individual scene prompts
- Prevents expensive Sora2 calls on bad concepts

### 4. Revision Loop (new Stage 3.6)

When user rejects the plan:
- **RevisionAgent** receives: original master prompt + original scenes + user comments
- Generates revised scene prompts incorporating feedback
- Re-submits to Plan Review Gate
- Preserves master prompt style fidelity across revisions

### 5. Core Elements Board Injection

- Core Elements Board image (from F6) injected as visual context for avatar settings
- Helps the AI agent understand the brand's setting and product context
- If brand has no Core Elements Board → skip (optional)

### 6. Music Engine (optional, parallel lane)

- Toggle: "Add background music?" in the brief
- If enabled: Suno V5 via Kie AI runs in parallel with video generation
- Mood auto-detected from master prompt tone or user-specified
- Music overlay applied via Assembly Engine after videos complete

### 7. Assembly Engine

- Multi-clip concatenation for spokesperson videos (currently produces standalone clips)
- If music enabled: overlay music at reduced volume (25%)
- Provider: Fal AI FFmpeg API
- Assembly sequence: Concat clips → Mix music → Export

### 8. Re-entry Controller

Resume from any stage via `job_stages` status check:
- `brief_intake` → `asset_analysis` → `scene_planning` → `plan_review` → `video_generation` → `assembly` → `delivery`
- If Sora2 generation fails on one scene, retry only that scene
- If user edits prompts, re-run only video generation + assembly

### 9. Tier Router

| Tier | Video Model | Use Case |
|------|-------------|----------|
| **Draft** | `sora2` | Fast iteration, first drafts |
| **Production** | `sora2-pro` | Approved finals, high quality |

- Auto-selects Draft before Plan Review Gate
- Switches to Production after approval
- `sora2-pro` adds `n_frames: "10"` and `size: "standard"` parameters

### 10. SEALCaM Prompting

- Not mandatory for spokesperson videos (dialogue-driven, not cinematic)
- Available as opt-in for users who want structured cinematic spokesperson content
- When enabled, structures prompts with Subject, Environment, Action, Lighting, Camera, Metatokens
