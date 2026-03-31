

## Redesign F2: AI Spokesperson → Lip-Sync Talking Head Pipeline

Replace the weak Sora2-based spokesperson pipeline with a proper audio-driven lip-sync architecture that produces realistic talking-head videos from a user's photo + voice.

---

### New Pipeline Flow

```text
Brief Intake → Voice Resolution → Base Video Generation → Lip-Sync → Assembly → Delivery

User Photo + Script
  ├─ Voice Lane: ElevenLabs TTS/Clone → Audio file
  ├─ Base Video Lane: Kling 2.6 (idle motion from photo)
  └─ Lip-Sync: LatentSync (draft) or Sync Labs Lipsync 2.0 (production)
      → Assembly Engine (music overlay, captions, brand watermark)
      → Final MP4
```

### Key Changes from Current Doc

**What's removed:**
- Sora2/Sora2-Pro as the primary video model (demoted to optional B-roll)
- Cameo @mention system (replaced by actual user photo)
- Master prompt mimicry as core feature (replaced by script-driven generation)
- Text-to-video as primary mode

**What's added:**
- **Stage 5A: Voice Resolution** — 3 modes:
  - User uploads their own audio recording
  - ElevenLabs TTS from script (using a default or brand voice)
  - ElevenLabs Voice Clone (user records 30s sample during onboarding, stored as brand asset)
- **Stage 5B: Base Video Generation** — Kling 2.6 image-to-video generates subtle idle motion (blinking, breathing, slight head movement) from user's photo. ~5s clip, looped to match audio duration
- **Stage 5C: Lip-Sync** — Audio-driven face animation:
  - Draft tier: ByteDance LatentSync via Fal.ai (`fal-ai/latentsync`) — ~$0.20/40s
  - Production tier: Sync Labs Lipsync 2.0 via Fal.ai (`fal-ai/sync-lipsync`) — ~$0.70/min
- **Stage 5D: Assembly** — FFmpeg merge: lip-synced video + background music (25% vol) + captions

**Updated Brief Intake fields:**
| Field | Type | Required |
|-------|------|----------|
| `script` | string | Yes — what the spokesperson says |
| `spokesperson_photo` | URL | Yes — user's photo or AI avatar |
| `voice_mode` | enum: `upload` \| `tts` \| `clone` | Yes |
| `voice_audio` | URL | If mode=upload |
| `voice_id` | string | If mode=clone (from brand assets) |
| `background_music` | boolean | No (default: false) |
| `aspect_ratio` | enum: `9:16` \| `16:9` | Yes |

**Updated Provider Summary:**
| Stage | Provider | Model |
|-------|----------|-------|
| Voice (TTS/Clone) | ElevenLabs | Eleven Multilingual V2 |
| Base Video | Kie AI | Kling 2.6 image-to-video |
| Lip-Sync (Draft) | Fal.ai | ByteDance LatentSync |
| Lip-Sync (Production) | Fal.ai | Sync Labs Lipsync 2.0 |
| Assembly | Fal AI | FFmpeg API |

**Updated Tier Router:**
| Tier | Lip-Sync Model | Cost | Quality |
|------|----------------|------|---------|
| Draft | LatentSync | ~$0.20/40s | 7/10 |
| Production | Sync Labs 2.0 | ~$0.70/min | 9/10 |

**Enterprise Engine modules retained:** Asset Analyzer, Creative Director Agent (for script enhancement), Plan Review Gate, Revision Loop, Music Engine, Assembly Engine, Re-entry Controller, Hook Library (for script/caption generation).

### File to Modify

**`docs/pipelines/AI_SPOKESPERSON_PIPELINE.md`** — Full rewrite of Stages 5-6 with new lip-sync architecture, updated Brief Intake fields, updated Provider Summary, and updated Enterprise Engine section (Tier Router models changed from Sora2 to LatentSync/Sync Labs).

