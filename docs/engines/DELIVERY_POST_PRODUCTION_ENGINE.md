# Delivery & Post-Production Engine — Module #17

> **Status**: Design reference — not yet implemented  
> **Owner**: Cross-family shared module  
> **Purpose**: Professional finishing layer between Assembly (#8) output and final delivery — handles subtitles, dubbing, audio mastering, video enhancement, thumbnails, watermarking, and multi-format export  
> **Trust principle**: Review versions are watermarked and stream-only; production versions unlock only after approval

---

## Overview

The system currently ends at Assembly (Module #8) — a raw stitched video. Module #17 bridges the gap between raw assembly and enterprise-grade deliverables by adding seven post-production capabilities in a single engine.

```text
Assembly Output (Module #8)
  │
  ▼
┌──────────────────────────────────────────┐
│  #17 — Delivery & Post-Production Engine │
│                                          │
│  1. Auto-Subtitles (burn-in or sidecar)  │
│  2. Dubbed Language Versions             │
│  3. Audio Polish (loudness, EQ, noise)   │
│  4. Video Enhancement (upscale, color)   │
│  5. Thumbnail / Preview Generation       │
│  6. Watermark / Review-Safe Versions     │
│  7. Production-Ready Export              │
│                                          │
└──────────────────────────────────────────┘
  │
  ▼
Two outputs:
  ├── REVIEW version (watermarked, 720p, stream-only, expires 7 days)
  └── PRODUCTION version (clean, full-res, multi-format, unlocked on approval)
```

---

## Provider Strategy

| Capability | Primary Provider | Fallback |
|------------|-----------------|----------|
| Auto-Subtitles | BytePlus VOD Smart Captioning | Whisper (via Fal.ai) → manual SRT upload |
| Dubbed Language | ElevenLabs Dubbing API | BytePlus VOD subtitle + TTS |
| Audio Polish | FFmpeg (loudness normalization, EQ) | BytePlus VOD audio transcoding |
| Video Enhancement | BytePlus VOD vCube (upscale, HDR, denoise) | Topaz API / FFmpeg filters |
| Thumbnails | BytePlus VOD Snapshot Template | FFmpeg frame extraction + Image Composer (#14) |
| Watermark | BytePlus VOD Watermark Template | FFmpeg overlay (text/image) |
| Export Profiles | FFmpeg + BytePlus VOD transcoding | Fal.ai FFmpeg API |

---

## Review-Safe Delivery Flow

```text
Job Completed (Assembly #8)
  │
  ▼
Post-Production Engine runs all selected options
  │
  ├── Generates REVIEW version:
  │     • Diagonal watermark: "BRANDFLOW PREVIEW — NOT FOR DISTRIBUTION"
  │     • Resolution capped at 720p
  │     • Subtitles burned in (preview quality)
  │     • Thumbnail generated
  │     • Expires after 7 days (configurable)
  │     • No download button — stream-only player
  │
  └── Stores PRODUCTION version (locked, not accessible):
        • Full resolution (1080p/4K)
        • Clean — no watermark
        • Subtitle tracks as sidecar files (SRT/VTT)
        • Audio mastered (LUFS normalized)
        • Video enhanced if selected

User Reviews REVIEW version
  │
  ├── APPROVE → Production version unlocked for download
  │              Multi-format export: MP4, MOV, vertical/horizontal
  │              Dubbed versions generated if requested
  │
  └── REJECT → Feedback captured → Revision Agent (#3) → Re-enter pipeline
```

---

## Capability Specifications

### 1. Auto-Subtitles

| Field | Value |
|-------|-------|
| **Primary** | BytePlus VOD Smart Captioning |
| **Fallback** | Whisper (via Fal.ai) → manual SRT upload |
| **Output** | SRT/VTT sidecar files or burned-in overlay |
| **Options** | Burn-in (permanent) or sidecar (toggleable) |
| **Styling** | Font, size, position, background — configurable per brand via Brand Voice DNA (#12) |
| **Language** | Auto-detect source language |

### 2. Dubbed Language Versions

| Field | Value |
|-------|-------|
| **Primary** | ElevenLabs Dubbing API |
| **Fallback** | BytePlus VOD subtitle + TTS |
| **Languages** | 29+ (ElevenLabs), extensible |
| **Output** | New audio track + translated subtitle file per language |
| **Trigger** | User selects target languages at Brief Intake or post-approval |
| **Voice preservation** | ElevenLabs preserves speaker voice characteristics across languages |

### 3. Audio Polish

| Field | Value |
|-------|-------|
| **Provider** | FFmpeg filters (already in Assembly Engine infrastructure) |
| **Loudness** | Normalization to -14 LUFS (streaming standard) |
| **Ducking** | Background music auto-duck when voiceover is active |
| **Noise reduction** | Single-pass noise reduction for AI-generated audio artifacts |
| **Fallback** | BytePlus VOD audio transcoding |

### 4. Video Enhancement

| Field | Value |
|-------|-------|
| **Primary** | BytePlus VOD vCube |
| **Fallback** | Topaz API / FFmpeg filters |
| **Upscale** | Super-resolution: 720p→1080p, 1080p→4K |
| **Color grading** | Presets: warm, cool, cinematic, vibrant |
| **Denoise** | AI-generated footage artifact reduction |
| **HDR** | Optional HDR conversion |

### 5. Thumbnails / Previews

| Field | Value |
|-------|-------|
| **Primary** | BytePlus VOD Snapshot Template |
| **Fallback** | FFmpeg frame extraction + Image Composer (#14) |
| **Candidate frames** | Auto-extract 3–5 frames at scene transitions |
| **Brand overlay** | Logo + title applied via Image Composer (#14) |
| **Animated preview** | 3–5 second GIF preview |

### 6. Watermark / Review-Safe

| Field | Value |
|-------|-------|
| **Primary** | BytePlus VOD Watermark Template |
| **Fallback** | FFmpeg overlay (text/image) |
| **Text watermark** | Diagonal semi-transparent: "BRANDFLOW PREVIEW — NOT FOR DISTRIBUTION" |
| **Logo watermark** | Optional brand logo for client previews |
| **Resolution cap** | Review versions capped at 720p |
| **Access control** | Stream-only player, no download, time-limited links (default 7 days) |

### 7. Production-Ready Export

| Field | Value |
|-------|-------|
| **Formats** | MP4 (H.264), MOV (ProRes), WebM |
| **Aspect ratios** | 16:9, 9:16, 1:1, 4:5 |
| **Platform presets** | Instagram, TikTok, YouTube, LinkedIn, Facebook |
| **Deliverables** | Video file + subtitle tracks + thumbnail set + metadata JSON |
| **Provider** | FFmpeg + BytePlus VOD transcoding |

---

## Platform Export Presets

| Platform | Aspect Ratio | Resolution | Max Duration | Format | Notes |
|----------|-------------|------------|-------------|--------|-------|
| Instagram Reels | 9:16 | 1080×1920 | 90s | MP4 H.264 | Auto-crop if source is 16:9 |
| Instagram Feed | 1:1 | 1080×1080 | 60s | MP4 H.264 | Letterbox or crop |
| TikTok | 9:16 | 1080×1920 | 60s | MP4 H.264 | Subtitles burned in by default |
| YouTube | 16:9 | 1920×1080 / 3840×2160 | No limit | MP4 H.264 | Sidecar SRT preferred |
| LinkedIn | 1:1 or 16:9 | 1080×1080 / 1920×1080 | 10min | MP4 H.264 | Professional tone subtitle style |
| Facebook | 16:9 or 4:5 | 1920×1080 / 1080×1350 | 240min | MP4 H.264 | Auto-caption recommended |

---

## Integration with Existing Modules

| Existing Module | Integration Point |
|----------------|-------------------|
| #8 Assembly Engine | Input — receives assembled video |
| #2 Plan Review Gate | Review version shown at approval checkpoint |
| #3 Revision Agent | Rejection feeds back into pipeline via revision loop |
| #9 Provider & Tier Routing | Routes to BytePlus VOD / FFmpeg / ElevenLabs |
| #10 Re-entry Controller | Can re-enter at post-production stage (skip re-generation) |
| #12 Brand Voice DNA | Subtitle styling + dubbing tone follows brand voice signature |
| #14 Template Image Composer | Thumbnail branding overlays |

---

## Cross-Family Adoption

| Family | Subtitles | Dubbing | Audio Polish | Enhancement | Thumbnails | Watermark | Export |
|--------|-----------|---------|-------------|-------------|------------|-----------|--------|
| F1 UGC | ✅ | opt | ✅ | opt | ✅ | ✅ | ✅ |
| F2 Spokesperson | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F3 Product Video | opt | opt | ✅ | ✅ | ✅ | ✅ | ✅ |
| F4 Social Content | ✅ | opt | — | — | ✅ | ✅ | ✅ |
| F5 Cinematic Ad | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F7 Ad Creator | ✅ | opt | ✅ | opt | ✅ | ✅ | ✅ |
| F8 Creative Cloner | ✅ | opt | ✅ | opt | ✅ | ✅ | ✅ |

**Legend**: ✅ = active by default, opt = user-selectable option, — = not applicable

---

## Delivery Output Schema

```json
{
  "delivery": {
    "review": {
      "review_url": "https://brandflow.app/review/{job_id}",
      "watermarked": true,
      "resolution": "720p",
      "expires_at": "2026-04-07T00:00:00Z",
      "stream_only": true,
      "thumbnail_url": "https://storage.../thumb_001.jpg",
      "subtitles_burned_in": true
    },
    "production": {
      "status": "locked | unlocked",
      "approved_at": null,
      "exports": [
        {
          "platform": "youtube",
          "format": "mp4",
          "aspect_ratio": "16:9",
          "resolution": "1920x1080",
          "download_url": null,
          "file_size_kb": 52000
        }
      ],
      "subtitle_tracks": [
        { "language": "en", "format": "srt", "url": "https://storage.../en.srt" }
      ],
      "dubbed_versions": [],
      "thumbnails": [
        { "url": "https://storage.../thumb_001.jpg", "timestamp_s": 2.5 },
        { "url": "https://storage.../thumb_002.jpg", "timestamp_s": 8.1 }
      ],
      "audio_master": {
        "lufs": -14,
        "noise_reduced": true,
        "music_ducking": true
      },
      "metadata": {
        "duration_s": 30,
        "original_resolution": "1080p",
        "enhanced_to": "4K",
        "color_grade": "cinematic"
      }
    }
  }
}
```

---

## BytePlus VOD Integration

BytePlus VOD provides a workflow-based API where processing steps are chained:

1. **Upload**: `UploadMediaByUrl` — ingest assembled video from storage
2. **Process**: Apply workflow templates (subtitle, watermark, enhancement, snapshot)
3. **Poll**: `QueryUploadTaskInfo` — same polling pattern as Kie AI `taskId`
4. **Retrieve**: `GetMediaInfos` — fetch processed outputs

This maps directly to the existing polling infrastructure in Provider & Tier Routing (#9).

### BytePlus VOD Fallback Chains (added to #9)

| Capability | Primary | Fallback 1 | Fallback 2 |
|------------|---------|------------|------------|
| Subtitles | BytePlus VOD Smart Captioning | Whisper (Fal.ai) | Manual SRT |
| Watermark | BytePlus VOD Watermark Template | FFmpeg overlay | — |
| Enhancement | BytePlus VOD vCube | Topaz API | FFmpeg filters |
| Snapshot | BytePlus VOD Snapshot Template | FFmpeg seek+capture | — |
| Transcoding | BytePlus VOD Transcode | FFmpeg | Fal.ai FFmpeg |

---

## Database Schema Extension

```sql
-- Add to existing jobs table or create delivery_outputs table
CREATE TABLE delivery_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  review_url TEXT,
  review_expires_at TIMESTAMPTZ,
  review_watermarked BOOLEAN DEFAULT true,
  review_resolution TEXT DEFAULT '720p',
  production_status TEXT DEFAULT 'locked', -- locked, unlocked
  approved_at TIMESTAMPTZ,
  exports JSONB DEFAULT '[]',
  subtitle_tracks JSONB DEFAULT '[]',
  dubbed_versions JSONB DEFAULT '[]',
  thumbnails JSONB DEFAULT '[]',
  audio_master JSONB DEFAULT '{}',
  enhancement_applied JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Build Order

Module #17 belongs to **Phase D — Delivery**, after all media generation modules:

```
Phase D — Delivery (post-assembly)
  └── 17. Delivery & Post-Production Engine
       ├── Depends on: #8 Assembly Engine (input)
       ├── Depends on: #9 Provider & Tier Routing (provider selection)
       ├── Depends on: #2 Plan Review Gate (approval flow)
       ├── Depends on: #14 Template Image Composer (thumbnails)
       └── Depends on: #12 Brand Voice DNA (subtitle/dubbing style)
```
