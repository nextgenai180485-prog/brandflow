

# Post-Production & Delivery Engine — Module #17

The system currently ends at Assembly (Module #8) — raw stitched video. There is no post-production layer handling the professional finishing that separates a draft from a deliverable. This new module closes that gap.

---

## The Problem

Right now, after Assembly, the user gets a raw merged video. No subtitles, no watermark during review, no thumbnails, no audio polish, no multi-language support. That is not enterprise delivery — it is a half-finished export.

---

## What This Module Covers

Seven post-production capabilities, bundled into a single **Delivery & Post-Production Engine** (Module #17):

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
  ├── REVIEW version (watermarked, lower-res, subtitled preview)
  └── APPROVED version (clean, full-res, polished final)
```

---

## Provider Strategy

BytePlus VOD is a strong fit — it offers subtitles, watermarks, snapshots, video enhancement, and transcoding in a single API. Combined with existing providers:

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

This is the trust architecture the user described:

```text
Job Completed (Assembly)
  │
  ▼
Post-Production Engine runs all selected options
  │
  ├── Generates REVIEW version:
  │     • Diagonal watermark: "BRANDFLOW PREVIEW — NOT FOR DISTRIBUTION"
  │     • Resolution capped at 720p
  │     • Subtitles burned in (preview quality)
  │     • Thumbnail generated
  │     • Expires after 7 days
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

## Detailed Capability Specs

### 1. Auto-Subtitles
- BytePlus VOD Smart Captioning: AI transcription → SRT/VTT generation
- Options: burn-in (permanent) or sidecar (toggleable)
- Style: font, size, position, background configurable per brand
- Language detection: auto-detect source language

### 2. Dubbed Language Versions
- ElevenLabs Dubbing API: preserves speaker voice characteristics across languages
- Supported: 29+ languages
- Output: new audio track + translated subtitle file
- User selects target languages at Brief Intake or post-approval

### 3. Audio Polish
- Loudness normalization to -14 LUFS (streaming standard)
- Background music ducking when voiceover is active
- Noise reduction pass
- All via FFmpeg filters (already in Assembly Engine infrastructure)

### 4. Video Enhancement
- BytePlus vCube: super-resolution upscaling (720p→1080p, 1080p→4K)
- Color grading presets (warm, cool, cinematic, vibrant)
- Denoise for AI-generated footage artifacts
- HDR conversion option

### 5. Thumbnails / Previews
- Auto-extract 3-5 candidate frames at scene transitions
- BytePlus Snapshot Template or FFmpeg seek + capture
- Apply brand overlay (logo, title) via Image Composer (#14)
- Generate animated GIF preview (3-5 seconds)

### 6. Watermark / Review-Safe
- Diagonal semi-transparent text watermark
- Optional brand logo watermark for client previews
- Resolution-limited streaming (no raw file access)
- Time-limited review links (configurable expiry)

### 7. Production-Ready Export
- Multi-format: MP4 (H.264), MOV (ProRes), WebM
- Multi-aspect: 16:9, 9:16, 1:1, 4:5
- Platform-optimized presets: Instagram, TikTok, YouTube, LinkedIn, Facebook
- Includes: video file + subtitle tracks + thumbnail set + metadata JSON

---

## Integration with Existing Modules

| Existing Module | Integration Point |
|----------------|-------------------|
| #8 Assembly Engine | Input — receives assembled video |
| #2 Plan Review Gate | Review version shown at approval |
| #3 Revision Agent | Rejection feeds back to pipeline |
| #9 Provider & Tier Routing | Routes to BytePlus / FFmpeg / ElevenLabs |
| #10 Re-entry Controller | Can re-enter at post-production stage |
| #12 Brand Voice DNA | Subtitle style + dubbing tone follows brand voice |
| #14 Template Image Composer | Thumbnail branding |

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

---

## Files to Create / Update

| Action | File | Change |
|--------|------|--------|
| Create | `docs/engines/DELIVERY_POST_PRODUCTION_ENGINE.md` | Full engine spec with all 7 capabilities |
| Update | `docs/ENGINE_MODULE_REGISTRY.md` | Add Module #17, update adoption matrix, update build order (Phase D — Delivery) |
| Update | `docs/pipelines/CROSS_FAMILY_ENGINE_AUDIT.md` | Add §17 Post-Production Engine entry |
| Update | `docs/engines/PROVIDER_ROUTING_POLICY.md` | Add BytePlus VOD fallback chains for subtitle, watermark, enhancement, snapshot |
| Update | All 7 video pipeline docs (F1-F5, F7, F8) | Append post-production stage referencing Module #17 |
| Update | `docs/PIPELINE_CONTRACTS.md` | Add delivery output schema (review_url, production_url, thumbnails, subtitle_tracks) |

**Total**: 1 new file + 11 updates = 12 file operations

---

## Technical Detail: BytePlus VOD Integration

BytePlus VOD provides a workflow-based API where you chain processing steps:

1. Upload media via `UploadMediaByUrl`
2. Apply processing templates (subtitle, watermark, enhancement, snapshot) via workflow
3. Poll `QueryUploadTaskInfo` for completion
4. Retrieve processed outputs via `GetMediaInfos`

This maps directly to our existing polling pattern (same as Kie AI `taskId` polling) and is handled by the Provider & Tier Routing Engine (#9).

