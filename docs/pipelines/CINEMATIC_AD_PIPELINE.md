# Cinematic Ad Pipeline — Technical Reference

> Reverse-engineered from production n8n workflow: `R50 | Cinematic Adverts System`

---

## Overview

The most complex generation pipeline. Produces a full cinematic advertisement with synchronized video scenes, background music, and voiceover narration. Uses a **5-lane parallel architecture** where visual prompts, scene images, scene videos, music, and voice are generated independently and assembled.

**Core principle**: Generate all components of a professional advertisement in parallel — visuals, audio, and script — then combine them into a polished final product.

---

## Pipeline Architecture

```text
                                    ┌─── PROMPTS lane ───┐
                                    │  Get Project        │
                                    │  → Analyze Image    │
                                    │  → AI Agent         │
                                    │  → Split Scenes     │
                                    │  → Log Prompts      │
                                    └─────────────────────┘
                                    
                                    ┌─── IMAGES lane ────┐
                                    │  Get Scenes         │
                                    │  → Start Frame 🍌   │
                                    │  → End Frame 🍌     │
                                    │  → Log Images       │
                                    └─────────────────────┘
                                    
                                    ┌─── VIDEOS lane ────┐
                                    │  Get Scenes         │
                                    │  → Create Video 🔻  │
                                    │  → Poll → Log       │
                                    └─────────────────────┘
                                    
                                    ┌─── MUSIC lane ─────┐
                                    │  Get Project        │
                                    │  → Create Songs     │
                                    │  → Poll → Log       │
                                    └─────────────────────┘
                                    
                                    ┌─── VOICE lane ─────┐
                                    │  Get Project        │
                                    │  → Create Voice     │
                                    │  → Poll → Log       │
                                    └─────────────────────┘
```

Each lane runs on its own **schedule trigger** in n8n, allowing independent execution and retry.

---

## Stage 1: Brief Intake

**Source**: Airtable project record (Brandflow: web UI form)

**Inputs**:
| Field | Type | Required | Example |
|-------|------|----------|---------|
| `Project Name` | string | Yes | "Luxury Perfume Ad" |
| `Creative Direction` | string | Yes | "40-second cinematic spot, moody noir, 5 scenes" |
| `Core Image` | URL (attachment) | Yes | Primary product/character reference |
| `Core Elements` | URL (attachment) | Yes | Elements board (from Family 6) |
| `Status` | enum | Yes | Set to "Create" to trigger |
| `aspect_ratio` | enum: `9:16` \| `16:9` | Yes | `16:9` |
| `voice id` | string | Yes | ElevenLabs voice ID |

---

## Stage 2: Analyze Elements Board

**Purpose**: Convert the visual elements board into a detailed text description.

**Provider**: Google Gemini 3 Pro (vision)

**Prompt**:
```
Please look at this image and describe it in detail. What is shown in the
character section, the setting section, and the product section? Explain what
you see in each part so the image can be fully translated into text.
```

**Output**: Detailed text description of character, setting, and product from the elements board.

---

## Stage 3: Scene Planning (AI Agent)

**Purpose**: Generate a complete ad package: script, music prompt, and N visually-driven scenes.

**Provider**: OpenRouter (configurable model) + Think Tool + Structured Output Parser

**System Prompt** (AGENT framework, condensed):
```
## 🎬 SYSTEM PROMPT: 40-Second Ad Generator Agent

A – Ask:
  Generate one JSON package containing ad script, music prompt, and scenes.
  Scene count based on user's creative direction (default: 5).

G – Guidance:
  role: Multimedia ad director and storyteller
  character_limit: Script fits a 40-second read

  🎬 Script guidelines:
    - If user provides script, USE EXACTLY as given
    - Continuous text, spoken by the character
    - Use "..." for pauses, no double quotes, no "—"

  🎵 Music prompt guidelines:
    - Fewer than 450 characters
    - Match emotional arc and visual tone

  🧱 Global visual consistency:
    - Derive base visual language from creative direction + elements board
    - Keep Lighting, Mood, Aesthetic consistent across all scenes

  🖼️ Starting image prompt (YAML format):
    Keys: Composition, Lighting, Environment, Action, Refinements,
          Camera, Aesthetic, Mood, Subject
    Keep compact (8-10 lines YAML)
    Refinements use meta-tokens: ultra_fine_skin_texture, subtle_makeup_sheen, etc.

  🎯 Ending image prompt:
    - Short description of how starting image changes (1-2 sentences)

  🎞️ Transition prompt:
    - Short description of character/camera action between frames
    - Default to SLOW movement
```

**Output Schema**:
```json
{
  "script": "Full 40-second voiceover script with ... pauses",
  "music_prompt": "Concise generative prompt (<450 chars)",
  "scenes": [
    {
      "scene": "Scene X - Title of Scene",
      "starting_image_prompt": "Composition: ...\nLighting: ...\nEnvironment: ...\nAction: ...\nRefinements: ...\nCamera: ...\nAesthetic: ...\nMood: ...\nSubject: ...",
      "ending_image_prompt": "Short 1-2 sentence evolution of starting frame",
      "camera_motion": {
        "move_type": "DOLLY_IN",
        "intensity": 0.3,
        "speed_curve": "EASE_IN_OUT"
      },
      "scene_transition": {
        "type": "DISSOLVE",
        "duration_ms": 1000
      },
      "interpolation": {
        "style": "SMOOTH",
        "easing": "EASE_IN_OUT"
      }
    }
  ]
}
```

> **Migration note**: The `transition_prompt` string field is replaced by structured `camera_motion`, `scene_transition`, and `interpolation` objects. See `engines/CAMERA_MOTION_ENGINE.md` (Module #24) for full schema. At runtime, the Camera Motion Engine translates structured parameters to provider-specific prompt text via `translateCameraMotion()`.

---

## Stage 4: Image Generation (per scene)

**Purpose**: Generate start and end frames for each scene using WaveSpeed nano-banana-pro.

**Provider**: WaveSpeed AI (`nano-banana-pro/edit`) — synchronous mode

### Start Frame
```json
POST https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit
{
  "aspect_ratio": "16:9",
  "enable_base64_output": false,
  "enable_sync_mode": true,
  "output_format": "png",
  "prompt": "<scene.starting_image_prompt>",
  "resolution": "2k",
  "images": ["<core_image_url>", "<core_elements_url>"]
}
```

### End Frame
```json
POST https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit
{
  "aspect_ratio": "16:9",
  "enable_sync_mode": true,
  "output_format": "png",
  "prompt": "<scene.ending_image_prompt>",
  "resolution": "2k",
  "images": ["<start_frame_output_url>"]
}
```

**Key detail**: End frame uses the generated start frame as input (same as Product Videography).

**Batching**: Batch size 1, 2-second intervals between requests.

---

## Stage 5: Video Generation (per scene)

**Purpose**: Generate cinematic transition video for each scene.

**Provider**: Kie AI Veo3 (`/api/v1/veo/generate`)

**Request**:
```json
{
  "prompt": "<scene.transition_prompt>",
  "model": "veo3_fast",
  "aspectRatio": "16:9",
  "enableTranslation": false,
  "generationType": "FIRST_AND_LAST_FRAMES_2_VIDEO",
  "imageUrls": ["<start_frame_url>", "<end_frame_url>"]
}
```

**Polling**: Wait ~15 seconds between polls. Check `data.successFlag === 1`.

---

## Stage 6: Music Generation

**Purpose**: Generate background music matching the ad's emotional arc.

**Provider**: Kie AI (`/api/v1/generate`) — routes to Suno V5

**Request**:
```json
POST https://api.kie.ai/api/v1/generate
{
  "model": "V5",
  "customMode": false,
  "instrumental": true,
  "callBackUrl": "https://api.example.com/callback",
  "prompt": "<music_prompt from AI agent>"
}
```

**Authentication**: API key via HTTP header

**Polling**:
- GET `https://api.kie.ai/api/v1/generate/record-info?taskId=<taskId>`
- Check `successFlag === 1`
- Result contains audio URL

---

## Stage 7: Voice Generation

**Purpose**: Generate voiceover narration from the ad script.

**Provider**: WaveSpeed AI → ElevenLabs Turbo v2.5

**Request**:
```json
POST https://api.wavespeed.ai/api/v3/elevenlabs/turbo-v2.5
{
  "similarity": 1,
  "stability": 0.5,
  "text": "<script from AI agent>",
  "use_speaker_boost": true,
  "voice_id": "<voice_id from project>"
}
```

**Authentication**: API key via HTTP header

**Response**: Returns `data.urls.get` for async polling.

**Polling**:
- GET `<data.urls.get>` with auth header
- Wait for completion
- Result contains audio URL

---

## Stage 8: Automated Assembly Pipeline

**Now automated** — replaces the previously manual assembly process.

### Step 1 — Concatenate Scene Videos

**Provider**: Fal AI (`fal-ai/ffmpeg-api/merge-videos`)

```json
POST https://queue.fal.run/fal-ai/ffmpeg-api/merge-videos
{
  "video_urls": ["<scene1_url>", "<scene2_url>", "<scene3_url>", "<scene4_url>", "<scene5_url>"]
}
```

- Input: Array of scene video URLs in chronological order
- Output: Single concatenated video URL
- Polling: ~60s, check `video.url` in response
- Authentication: API key via header (`Authorization: Key <FAL_API_KEY>`)

### Step 2 — Mix Audio Layers

**Provider**: Fal AI FFmpeg API (custom FFmpeg command)

```
ffmpeg -i concat.mp4 -i music.mp3 -i voice.mp3 \
  -filter_complex "[1:a]volume=0.25[bg];[2:a]volume=1.0[vo];[bg][vo]amix=inputs=2[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -shortest output.mp4
```

- Input: Concatenated video + music URL (from Stage 6) + voice URL (from Stage 7)
- Background music at 25% volume
- Voiceover at 100% volume
- `-shortest` flag ensures output matches video duration
- Output: Final video with mixed audio

### Step 3 — Add Transitions (optional)

- 0.5s crossfade between scenes using FFmpeg `xfade` filter
- Applied during the concatenation step if enabled in brief settings
- Transition types: crossfade (default), fade-to-black, dissolve

### Step 4 — Export

- Aspect ratio enforcement (16:9 or 9:16 based on brief)
- Store final MP4 in Supabase Storage
- Create artifact record linked to the generation job
- Notify user that assembly is complete

---

## Provider Summary

| Stage | Provider | API Endpoint | Auth |
|-------|----------|-------------|------|
| Analyze Image | Google Gemini 3 Pro | Gemini API (vision) | API key |
| Scene Planning | OpenRouter | OpenRouter API (chat) | API key |
| Start/End Frames | WaveSpeed AI | `api.wavespeed.ai/api/v3/google/nano-banana-pro/edit` | HTTP header |
| Video Generation | Kie AI (Veo3) | `api.kie.ai/api/v1/veo/generate` | HTTP header |
| Video Polling | Kie AI | `api.kie.ai/api/v1/veo/record-info` | HTTP header |
| Music Generation | Kie AI (Suno V5) | `api.kie.ai/api/v1/generate` | HTTP header |
| Music Polling | Kie AI | `api.kie.ai/api/v1/generate/record-info` | HTTP header |
| Voice Generation | WaveSpeed (ElevenLabs) | `api.wavespeed.ai/api/v3/elevenlabs/turbo-v2.5` | HTTP header |
| Voice Polling | WaveSpeed | `<response_url>` | HTTP header |

---

## 5-Lane Parallel Architecture

Each lane runs independently on its own schedule:

| Lane | Trigger | Depends On | Output |
|------|---------|------------|--------|
| **PROMPTS** | Schedule | Project record | Scenes JSON + Script + Music prompt |
| **IMAGES** | Schedule | Completed prompts | Start/end frame URLs per scene |
| **VIDEOS** | Schedule | Completed images | Video URLs per scene |
| **MUSIC** | Schedule | Completed prompts (music_prompt) | Music audio URL |
| **VOICE** | Schedule | Completed prompts (script) | Voice audio URL |

**Brandflow adaptation**: Replace schedule triggers with job orchestrator. IMAGES depends on PROMPTS; VIDEOS depends on IMAGES; MUSIC and VOICE depend on PROMPTS only (can run in parallel with IMAGES).

---

## Key Design Notes

1. **Most complex pipeline** — 5 independent lanes, 4 different API providers, 3 media types (video, music, voice)
2. **Assembly is manual** in n8n — Brandflow should automate this
3. **Elements Board (Family 6) is a prerequisite** — the Core Elements attachment feeds visual context
4. **Voice ID** must be pre-selected from ElevenLabs voice library
5. **Suno V5 via Kie AI** — music generation uses a different Kie AI endpoint (`/api/v1/generate`) than video
6. **WaveSpeed proxies ElevenLabs** — voice generation goes through WaveSpeed's API, not directly to ElevenLabs
7. **Scene count is dynamic** — determined by creative direction (default: 5 scenes)

---

## Brandflow Implementation Notes

1. **Replace Airtable** with Supabase tables and `job_stages` per lane
2. **The 5-lane pattern** maps to 5 parallel `job_stage` groups, with dependency tracking
3. **Assembly automation** is a major value-add over the n8n workflow — use FFmpeg to merge all outputs
4. **Voice ID selection** needs a UI for browsing/previewing ElevenLabs voices (store as brand assets)
5. **Music generation** could offer genre/mood presets alongside custom prompts
6. **Total pipeline time**: ~20-30 minutes (prompts: 30s → images: 2min → videos: 15min each + music: 3min + voice: 1min)
7. **Cost optimization**: This is the most expensive pipeline — consider offering scene count limits on lower tiers

---

## Enterprise Engine Integration

> Applied from Cross-Family Engine Audit — standardizes this pipeline with enterprise-grade shared modules.

### 1. Asset Analyzer (replaces Stage 2)

Switch from Gemini free-text to the unified `AnalyzeAsset` Edge Function:
- **Mode**: `composite` (analyzes character + setting + product from the Elements Board)
- **Provider**: Gemini via Lovable AI Gateway (already uses Gemini, standardize output)
- **Output**: Structured YAML with character, setting, and product sections
- Eliminates inconsistent free-text analysis

### 2. Creative Director Agent (upgrades Stage 3)

Stage 3 already uses the AGENT framework ("Multimedia Ad Director") — enhancements:
- **Think Tool**: Ensure mandatory reasoning pass before generating scenes
- **SEALCaM output format**: Standardize scene prompts to SEALCaM 6-field structure
- **Structured creative summary**: Include scene-by-scene breakdown with estimated generation time per lane

### 3. Plan Review Gate (new Stage 3.5)

Mandatory checkpoint — critical for the most expensive pipeline:
- User sees: all scenes with descriptions, script preview, music mood, estimated 20-30 min generation time
- Cost estimate based on scene count × (image + video) + music + voice
- Actions: Approve / Reject / Edit individual scene prompts / Edit script
- On approval → all 5 lanes proceed in parallel

### 4. Revision Loop (new Stage 3.6)

When user rejects the plan:
- **RevisionAgent** receives: creative direction + elements board analysis + original scenes + script + user comments
- Generates revised scenes/script incorporating feedback
- Re-submits to Plan Review Gate
- Can revise individual scenes without regenerating the entire plan

### 5. SEALCaM Adoption

Convert existing YAML-style scene prompts to SEALCaM 6-field standard:

| Current Field | SEALCaM Field |
|---------------|---------------|
| Composition | Subject + Camera |
| Lighting | Lighting |
| Environment | Environment |
| Action | Action |
| Refinements | Metatokens |
| Camera | Camera |
| Aesthetic + Mood + Subject | Metatokens (appended) |

- Enables template reuse across F3, F5, F7, F8
- Existing prompt quality maintained — format standardization only

### 6. Hook Library Injection

- Query `hooks` table for top-performing hooks in brand's industry
- Inject hooks into script generation and caption creation
- Ensures the ad's narrative hook is grounded in proven engagement patterns
- See `HOOK_LIBRARY_ENGINE_DESIGN.md` for schema and query patterns

### 7. Assembly Engine (Stage 8 — now automated)

See **Stage 8: Automated Assembly Pipeline** above for full details:
- Step 1: Concat scene videos (Fal AI FFmpeg)
- Step 2: Mix music (25% vol) + voiceover (100% vol)
- Step 3: Optional crossfade transitions (0.5s)
- Step 4: Export with aspect ratio enforcement → Supabase Storage

### 8. Re-entry Controller

Each of the 5 lanes gets independent resume capability:
- **PROMPTS lane**: `analysis` → `scene_planning` → `plan_review`
- **IMAGES lane**: `start_frame_gen` → `end_frame_gen` (per scene)
- **VIDEOS lane**: `video_gen` → `video_poll` (per scene)
- **MUSIC lane**: `music_gen` → `music_poll`
- **VOICE lane**: `voice_gen` → `voice_poll`
- **ASSEMBLY**: `concat` → `audio_mix` → `transitions` → `export`
- If one lane fails, retry only that lane without affecting others

### 9. Tier Router

| Tier | Image Model | Video Model | Voice Model | Use Case |
|------|-------------|-------------|-------------|----------|
| **Draft** | nano-banana-pro (standard) | `veo3_fast` | ElevenLabs Turbo v2.5 | Fast iteration |
| **Production** | nano-banana-pro (2k) | `veo3` | ElevenLabs Turbo v2.5 | Approved finals |

- Auto-selects Draft before Plan Review Gate
- Switches to Production after approval
- Voice model stays the same (ElevenLabs quality is consistent across tiers)

### 10. Core Elements Board

- Already a prerequisite for this pipeline (F6 → F5 dependency)
- Standardize: auto-pull from brand assets during brief intake

### 11. Brand Voice DNA Integration

Inject `voice_signature.json` into Stage 3 script generation:
- Prepend `## Brand Voice Context` block to the scene planning agent's system prompt
- Ensures ad scripts match brand tone, vocabulary, and CTA patterns
- Platform variations applied if generating for specific social platform distribution
- See `engines/BRAND_VOICE_DNA_ENGINE.md` for full schema and injection contract

### 12. Character Consistency Integration

For multi-scene cinematic ads with recurring characters:
- Extract canonical character descriptor from Elements Board analysis (Stage 2)
- Inject `## Character Consistency — MANDATORY` block into EVERY scene's image prompt
- Pass Scene N end-frame as visual reference to Scene N+1 start-frame generation
- Store `character_seed_reference` per initiative for cross-session consistency
- See `engines/CHARACTER_CONSISTENCY_ENGINE.md` for descriptor schema and passthrough logic

### 13. Provider Routing

All provider calls route through the Provider Routing Layer:
- Video: Kie AI → Runway → Pika (fallback chain)
- Image: WaveSpeed → OpenAI Images → SDXL (fallback chain)
- Music: Suno → Udio (fallback chain)
- Voice: ElevenLabs → WaveSpeed ElevenLabs proxy (fallback chain)
- See `engines/PROVIDER_ROUTING_POLICY.md` for health-check and failover logic
- If brand has no Core Elements Board → prompt user to generate one first

### 14. Delivery & Post-Production (Module #17)

After Assembly, output passes through Module #17 for enterprise-grade finishing:
- **Auto-Subtitles**: ✅ (burned-in or sidecar — critical for cinematic ads)
- **Dubbing**: ✅ (multi-language cinematic voiceover via ElevenLabs Dubbing API)
- **Audio Polish**: ✅ (loudness normalization, music ducking during VO, noise reduction)
- **Video Enhancement**: ✅ (upscale to 4K, cinematic color grading, denoise)
- **Thumbnails**: ✅ (scene-transition extraction + brand overlay)
- **Watermark**: ✅ (review versions watermarked, stream-only, 7-day expiry)
- **Export**: ✅ (multi-format: MP4/MOV/WebM, multi-aspect: 16:9/9:16/1:1/4:5)
- Review version shown at Plan Review Gate (#2); production version unlocked on approval
- See `engines/DELIVERY_POST_PRODUCTION_ENGINE.md` for full specification
