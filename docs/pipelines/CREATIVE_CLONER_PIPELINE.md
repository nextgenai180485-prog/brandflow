# Family 8 — Creative Cloner Pipeline

> **Source workflow**: R51 The Creative Cloner AI Agent by RoboNuggets
> **Purpose**: Video-to-video recreation — analyze an existing ad's cinematic structure via SEALCaM, then recreate each scene with new subjects/products while preserving the original's visual grammar.

---

## Architecture Overview

```
INPUT VIDEO + REFERENCE IMAGES
        │
        ▼
┌─────────────────────────────┐
│  STAGE 1 — VIDEO ANALYSIS   │  Gemini 3 Pro (via OpenRouter)
│  SEALCaM cinematic breakdown │  Extracts scenes, timing, camera
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  STAGE 2 — PROMPT GEN       │  Gemini 3 Pro AI Agent
│  Script + scene prompts      │  Outputs: script, music_prompt,
│  (SEALCaM-structured)        │  scenes[].start_image_prompt,
│                              │  scenes[].video_prompt
└──────────┬──────────────────┘
           │
     ┌─────┼──────────┐
     ▼     ▼          ▼
  IMAGES  VIDEOS    MUSIC        ← 3 parallel lanes
     │     │          │
     ▼     ▼          ▼
┌────────┐┌──────────┐┌─────────┐
│WaveSpd ││WaveSpd   ││Kie AI   │
│nano-   ││kling-v2.6││Suno V5  │
│banana- ││-pro i2v  ││instrume-│
│pro/edit││5s clips  ││ntal ×2  │
└────────┘└──────────┘└─────────┘
     │         │           │
     └─────────┼───────────┘
               ▼
        FINAL ASSEMBLY
```

---

## Stage 1 — Video Analysis

| Field | Value |
|-------|-------|
| **Provider** | OpenRouter |
| **Model** | `google/gemini-3-pro` |
| **Role** | Cinematic analyst — deconstructs input video into SEALCaM-structured scenes |
| **Input** | Video URL (uploaded to temporary storage) |
| **System prompt** | SEALCaM framework instructions (see `SEALCAM_FRAMEWORK.md`) |

### Output Schema

```json
{
  "scene_count": 4,
  "scenes": [
    {
      "scene_number": 1,
      "duration_estimate": "3s",
      "subject": "...",
      "environment": "...",
      "action": "...",
      "lighting": "...",
      "camera": "...",
      "metatokens": "..."
    }
  ]
}
```

---

## Stage 2 — Prompt Generation (AI Agent)

| Field | Value |
|-------|-------|
| **Provider** | OpenRouter |
| **Model** | `google/gemini-3-pro` |
| **Role** | Creative Director AI Agent |
| **Framework** | AGENT-style (Aim → Guidelines → Execute → Narrate → Tune) |
| **Input** | SEALCaM analysis from Stage 1 + reference product/character images + brand brief |

### System Prompt Summary

The agent receives:
1. The SEALCaM breakdown of the original video
2. Reference images of the new subject/product
3. Brand guidelines (tone, colors, target audience)

It must output prompts that preserve the original's cinematic structure while substituting the new subject.

### Output Schema

```json
{
  "script": "Full ad script with scene directions...",
  "music_prompt": "Upbeat electronic track, 120 BPM, modern brand feel...",
  "scenes": [
    {
      "scene_number": 1,
      "start_image_prompt": "SEALCaM-structured prompt for start frame compositing...",
      "video_prompt": "SEALCaM-structured prompt for video generation...",
      "duration": "5s"
    }
  ]
}
```

---

## Stage 3A — Image Generation (Start Frames)

| Field | Value |
|-------|-------|
| **Provider** | WaveSpeed AI |
| **Model** | `nano-banana-pro/edit` |
| **Endpoint** | `POST https://api.wavespeed.ai/api/v3/nano-banana-pro/edit` |
| **Purpose** | Composite reference product/character into SEALCaM-structured scene |

### Request

```json
{
  "prompt": "{{scenes[n].start_image_prompt}}",
  "image": "{{reference_image_url}}",
  "size": "2048x2048",
  "steps": 30,
  "seed": -1
}
```

### Response

```json
{
  "request_id": "abc-123",
  "status": "completed",
  "output": {
    "images": ["https://...composited-frame.png"]
  }
}
```

### Polling Pattern

WaveSpeed `nano-banana-pro/edit` typically completes in 10–30s. Poll via:

```
GET https://api.wavespeed.ai/api/v3/predictions/{request_id}/status
```

Every **5 seconds**, check `status === "completed"`.

---

## Stage 3B — Video Generation

| Field | Value |
|-------|-------|
| **Provider** | WaveSpeed AI |
| **Model** | `kling-v2.6-pro` (image-to-video) |
| **Endpoint** | `POST https://api.wavespeed.ai/api/v3/kling-v2.6-pro/img2video` |
| **Input** | Start frame from Stage 3A + video prompt |
| **Output** | 5-second video clip per scene |

### Request

```json
{
  "prompt": "{{scenes[n].video_prompt}}",
  "image": "{{start_frame_url}}",
  "duration": "5",
  "cfg_scale": 0.5,
  "seed": -1
}
```

### Response

```json
{
  "request_id": "xyz-789",
  "status": "processing"
}
```

### Polling Pattern

Video generation takes 2–5 minutes. The n8n workflow uses:

1. **Initial wait**: 15 seconds
2. **Status check loop**: `GET /api/v3/predictions/{request_id}/status` every **15 seconds**
3. **Terminal states**: `completed` (success) or `failed` (retry/abort)
4. **Max retries**: 40 iterations (~10 minutes timeout)

```json
// Status response
{
  "status": "completed",
  "output": {
    "video": "https://...scene-1.mp4"
  }
}
```

---

## Stage 3C — Music Generation

| Field | Value |
|-------|-------|
| **Provider** | Kie AI (Suno V5 wrapper) |
| **Endpoint** | `POST https://api.kie.ai/api/v1/generate` |
| **Model** | Suno V5 |
| **Output** | 2 instrumental audio variants |

### Request

```json
{
  "prompt": "{{music_prompt}}",
  "isInstrumental": true
}
```

### Polling Pattern

1. **Initial wait**: 5 minutes (300 seconds) — Suno generation is slow
2. **Status check**: `GET https://api.kie.ai/api/v1/generate?taskId={{taskId}}`
3. **Poll interval**: 30 seconds
4. **Terminal**: `status === "completed"`

### Response (completed)

```json
{
  "status": "completed",
  "sunoData": [
    {
      "audioUrl": "https://...variant-1.mp3",
      "title": "Generated Track 1"
    },
    {
      "audioUrl": "https://...variant-2.mp3",
      "title": "Generated Track 2"
    }
  ]
}
```

---

## Provider Summary

| Stage | Provider | Model / Endpoint | Auth | Polling |
|-------|----------|-------------------|------|---------|
| Video Analysis | OpenRouter | `google/gemini-3-pro` | Bearer token | Sync (streaming) |
| Prompt Generation | OpenRouter | `google/gemini-3-pro` | Bearer token | Sync (streaming) |
| Start Frames | WaveSpeed AI | `nano-banana-pro/edit` | API key header | 5s interval |
| Video Clips | WaveSpeed AI | `kling-v2.6-pro` img2video | API key header | 15s initial + 15s interval |
| Music | Kie AI | Suno V5 `/api/v1/generate` | API key header | 5min initial + 30s interval |

---

## Brandflow Migration Notes

### What Changes from n8n

1. **Video upload handling**: n8n receives video via webhook; Brandflow receives via web upload → store in Supabase Storage, pass signed URL to Gemini
2. **Reference image management**: n8n uses static URLs in workflow; Brandflow pulls from Brand Kit assets
3. **SEALCaM as shared module**: The SEALCaM framework prompt lives in `SEALCAM_FRAMEWORK.md` and should be injected into the system prompt at runtime — not hardcoded per-pipeline
4. **Sequential dependency**: Images must complete before videos start (video needs start frame). Music runs in parallel with both.
5. **A/B provider testing**: `kling-v2.6-pro` is the primary i2v model; consider testing against Kie AI `Sora2-Pro` for quality comparison
6. **Assembly stage**: n8n workflow ends at individual assets; Brandflow must add a final composition step (FFmpeg or cloud video editor) to stitch clips + overlay music

### Key Differences from Other Families

- **Only family that takes video input** (all others start from text/images)
- **SEALCaM-driven prompts** ensure structural fidelity to the source
- **No character/voice asset resolution** — subjects come from reference images, not avatar databases
- **kling-v2.6-pro** is unique to this family (other families use Sora2 or Veo3)
