# AI Spokesperson — Lip-Sync Talking Head Pipeline

> Redesigned from Sora2-based text-to-video to audio-driven lip-sync architecture for realistic talking-head videos.

---

## Overview

Generates realistic talking-head videos where the user (or an AI avatar) speaks directly to camera with perfectly synchronized lip movements. The system takes a user photo + script, generates or clones voice audio, creates a base video with idle motion, then applies audio-driven lip-sync for natural mouth movement.

**Core principle**: Audio-driven face animation produces far superior results (8-9/10) compared to text-to-video spokesperson generation (5-6/10). The lip-sync model animates an existing face to match audio, rather than trying to generate speech from text prompts.

---

## Pipeline Stages

```text
Brief Intake → Script Enhancement → Voice Resolution → Base Video Generation
  → Lip-Sync → Assembly → Delivery

User Photo + Script
  ├─ Voice Lane: ElevenLabs TTS/Clone/Upload → Audio file
  ├─ Base Video Lane: Kling 2.6 (idle motion from photo) → ~5s loop
  └─ Lip-Sync: LatentSync (draft) or Sync Labs Lipsync 2.0 (production)
      → Assembly Engine (music overlay, captions, brand watermark)
      → Final MP4
```

---

## Stage 0: Creative Direction (Module #23)

**Mandatory first stage** — transforms business inputs into a strategic creative brief optimized for spokesperson content. For F2, this stage applies authority-biased angle selection, script-first flow, and direct-address hook styles. Output includes talking points, CTA placement logic, and script structure. See `engines/CREATIVE_DIRECTION_ENGINE.md`.

---

## Stage 1: Brief Intake

**Source**: Brandflow web UI form

**Inputs**:
| Field | Type | Required | Example |
|-------|------|----------|---------|
| `script` | string | Yes | "Hey everyone! Today I want to share 3 tips for..." |
| `spokesperson_photo` | URL | Yes | User's photo or AI avatar image |
| `voice_mode` | enum: `upload` \| `tts` \| `clone` | Yes | `clone` |
| `voice_audio` | URL | If mode=upload | User's recorded audio file |
| `voice_id` | string | If mode=clone | ElevenLabs voice ID from brand assets |
| `tts_voice` | string | If mode=tts | Default ElevenLabs voice selection |
| `background_music` | boolean | No (default: false) | true |
| `music_mood` | string | If background_music=true | "upbeat corporate" |
| `aspect_ratio` | enum: `9:16` \| `16:9` | Yes (default: `9:16`) | `9:16` |
| `caption_style` | enum: `none` \| `minimal` \| `animated` | No (default: `none`) | `animated` |
| `industry` | string | No | "skincare" |

---

## Stage 2: Analyze Spokesperson Image

**Purpose**: Validate the photo is suitable for lip-sync (frontal face, good lighting, sufficient resolution) and extract visual context.

**Provider**: Unified `AnalyzeAsset` Edge Function (mode: `character`)

**Validation checks**:
- Face detected and frontal-facing (not profile/side)
- Minimum resolution: 512x512
- Good lighting (not heavily shadowed)
- Single face preferred (multi-face may produce artifacts)

**Output**: YAML with character details + suitability score.

**If validation fails**: Return actionable feedback ("Please upload a front-facing photo with even lighting").

---

## Stage 3: Script Enhancement (Creative Director Agent)

**Purpose**: Enhance the user's raw script into a polished, engaging spokesperson script — incorporating proven hooks and brand voice.

**Provider**: Gemini via Lovable AI Gateway (AGENT framework + Think Tool)

**Process**:
1. **Hook Library query**: Pull top-performing hooks for the user's industry
2. **Brand Voice check**: Load brand tone/vocabulary if available
3. **Think Tool**: Reason about script structure, hook placement, CTA positioning
4. **Enhancement**: Polish script while preserving the user's core message

**System Prompt** (AGENT framework):
```
## SYSTEM PROMPT: Spokesperson Script Director 🎤

A – Ask:
  Enhance the user's script for a talking-head video. Make it engaging,
  natural-sounding when spoken aloud, and optimized for social media attention.

G – Guidance:
  role: Script director for social media spokesperson videos
  constraints:
    - Preserve the user's core message and intent
    - Open with a strong hook (reference Hook Library results)
    - Keep sentences short and punchy (spoken, not written)
    - Include natural pauses (marked with "...")
    - End with a clear CTA
    - Match brand voice if available
    - Script length should produce 15-60 second audio
    - If user says "use my script exactly", skip enhancement

E – Examples:
  Weak: "I want to talk about our new product launch."
  Strong: "Stop scrolling. This changes everything about [topic]..."

T – Tools:
  - Think Tool: Reason about hook selection and script flow
  - Hook Library: Query for industry-relevant opening hooks
```

**Output**:
```json
{
  "enhanced_script": "Stop scrolling. Here's what nobody tells you about...",
  "estimated_duration_seconds": 32,
  "hook_used": "Stop scrolling pattern",
  "caption": "3 skincare tips that actually work 🧴✨ #skincare #tips",
  "title": "Skincare Tips Nobody Talks About"
}
```

---

## Stage 3.5: Plan Review Gate

**Purpose**: User approves the enhanced script, voice preview, and cost estimate before generation.

**User sees**:
- Enhanced script (editable)
- Estimated audio duration
- Voice preview (if TTS/clone: generate 5-second sample)
- Photo that will be used
- Estimated cost breakdown
- Estimated generation time (~3-5 minutes)

**Actions**: Approve / Edit Script / Change Voice / Reject

---

## Stage 3.6: Revision Loop

When user edits or rejects:
- **RevisionAgent** receives: original script + enhanced version + user edits/comments
- Re-generates enhanced script incorporating feedback
- Re-submits to Plan Review Gate
- Max 3 revision cycles before forcing manual script entry

---

## Stage 4: Split into Parallel Lanes

After approval, three lanes run in parallel:

```text
Lane A: Voice Resolution (Stage 5A)
Lane B: Base Video Generation (Stage 5B)
Lane C: Music Generation (Stage 5C, if enabled)

All three complete → Lip-Sync (Stage 5D) → Assembly (Stage 5E)
```

---

## Stage 5A: Voice Resolution

**Purpose**: Produce the final audio file of the spokesperson speaking the script.

### Mode 1: User Upload
- User provides pre-recorded audio file
- Validate: audio format (MP3/WAV/M4A), duration (5-120 seconds)
- Store in Supabase Storage
- **Cost**: Free

### Mode 2: ElevenLabs TTS
- Generate speech from enhanced script using a selected ElevenLabs voice
- **Provider**: ElevenLabs Text-to-Speech API
- **Model**: `eleven_multilingual_v2` (highest quality, 29 languages)
- **Voice Settings**: stability 0.4, similarity_boost 0.75, style 0.3 (conversational)
- **Output format**: `mp3_44100_128`
- **Cost**: ~$0.02-0.06 per script (based on character count)

### Mode 3: ElevenLabs Voice Clone
- User records 30-second voice sample during brand onboarding (stored as brand asset)
- Clone registered via ElevenLabs Instant Voice Clone API
- TTS generation uses the cloned voice ID
- **Provider**: ElevenLabs Voice Clone + TTS
- **Cost**: Clone creation (one-time) + ~$0.02-0.06 per generation

**Output**: Audio file URL + duration in seconds.

---

## Stage 5B: Base Video Generation

**Purpose**: Generate a short video clip with subtle idle motion from the user's photo — blinking, breathing, slight head movement. This gives the lip-sync model a natural-looking base to animate.

**Provider**: Kie AI (Kling 2.6 image-to-video)

**Request**:
```json
POST https://api.kie.ai/api/v1/jobs/createTask
{
  "model": "kling-2.6-image-to-video",
  "input": {
    "prompt": "A person looking directly at the camera with subtle natural idle motion — gentle blinking, slight breathing movement, minimal head sway. Maintain exact facial features and appearance. Neutral expression, ready to speak. No dramatic movement.",
    "image_urls": ["<spokesperson_photo>"],
    "aspect_ratio": "<portrait|landscape>",
    "remove_watermark": true
  }
}
```

**Polling**: GET `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=<taskId>`

**Output**: ~5 second video clip of the person with natural idle motion.

**Loop logic**: If audio is longer than base video, loop the base video to match audio duration (handled in Assembly stage).

**Cost**: ~$0.10-0.15 per generation

---

## Stage 5C: Music Generation (Optional, Parallel)

**Condition**: Only runs if `background_music: true` in brief.

**Provider**: Kie AI (Suno V4)

**Request**:
```json
POST https://api.kie.ai/api/v1/generate
{
  "model": "suno-v4",
  "input": {
    "prompt": "<music_mood> background music for a spokesperson video, subtle and non-intrusive, instrumental only",
    "duration": "<match audio duration>"
  }
}
```

**Cost**: ~$0.05-0.10

---

## Stage 5D: Lip-Sync Generation

**Purpose**: Apply audio-driven face animation to the base video, synchronizing lip movements to the voice audio.

### Draft Tier: ByteDance LatentSync

**Provider**: Fal.ai (`fal-ai/latentsync`)

**How it works**: LatentSync uses a latent diffusion-based approach to animate facial movements from audio. It modifies only the mouth/jaw region while preserving the rest of the face.

**Request**:
```json
POST https://queue.fal.run/fal-ai/latentsync
{
  "video_url": "<base_video_url>",
  "audio_url": "<voice_audio_url>"
}
```

**Polling**: Check `request_id` via Fal.ai queue status endpoint.

**Quality**: 7/10 — Good for previews and drafts. Occasional artifacts around jaw line.
**Speed**: ~30-60 seconds for a 30s video.
**Cost**: ~$0.20 per 40 seconds of video.

### Production Tier: Sync Labs Lipsync 2.0

**Provider**: Fal.ai (`fal-ai/sync-lipsync`)

**How it works**: Sync Labs uses a proprietary model trained on millions of talking-head videos. Higher fidelity lip movements, better teeth rendering, and more natural jaw movement.

**Request**:
```json
POST https://queue.fal.run/fal-ai/sync-lipsync
{
  "video_url": "<base_video_url>",
  "audio_url": "<voice_audio_url>"
}
```

**Quality**: 9/10 — Production-ready. Natural lip movements, proper teeth visibility, minimal artifacts.
**Speed**: ~60-120 seconds for a 30s video.
**Cost**: ~$0.70 per minute of video.

### Tier Selection Logic
```
if tier === "draft":
  model = "fal-ai/latentsync"        // Fast, cheap, good for previews
else if tier === "production":
  model = "fal-ai/sync-lipsync"      // High quality, production-ready
```

- Auto-selects **Draft** before Plan Review Gate (for preview generation)
- Switches to **Production** after final approval

---

## Stage 5E: Assembly

**Purpose**: Combine lip-synced video with audio layers, captions, and brand elements.

**Provider**: Fal AI FFmpeg API (`fal-ai/ffmpeg-api`)

**Assembly sequence**:

1. **Loop base video** (if needed): Extend lip-synced video to match audio duration
2. **Mix audio layers**:
   - Voice audio at full volume (100%)
   - Background music at reduced volume (25%) — if enabled
3. **Add captions** (if enabled): Burn-in subtitles from script text
4. **Brand watermark**: Optional brand logo overlay (bottom-right, 10% opacity)
5. **Aspect ratio enforcement**: Ensure final output matches requested ratio (9:16 or 16:9)

**FFmpeg command equivalent**:
```bash
ffmpeg -i lipsync_video.mp4 -i voice.mp3 -i music.mp3 \
  -filter_complex "[1:a]volume=1.0[vo];[2:a]volume=0.25[bg];[vo][bg]amix=inputs=2[a]" \
  -map 0:v -map "[a]" -c:v libx264 -c:a aac -shortest output.mp4
```

**Output**: Final MP4 stored in Supabase Storage.

---

## Stage 6: Delivery

**Artifacts stored**:
- Final assembled MP4 (primary deliverable)
- Voice audio file (reusable for re-generation)
- Base video clip (reusable for different scripts)
- Caption text
- Thumbnail (extracted from first frame)

**Metadata logged** to `job_stages` table:
- Voice mode used, voice duration
- Lip-sync model used, quality tier
- Music enabled/disabled
- Total generation time, total cost

**Social Distribution**: Via Brandflow's social publishing module with platform-optimized versions:
- Instagram Reels: 9:16, captions on
- TikTok: 9:16, captions on
- LinkedIn: 16:9 or 9:16, captions optional
- YouTube Shorts: 9:16

---

## Provider Summary

| Stage | Provider | Model/Endpoint |
|-------|----------|----------------|
| Image Analysis | Unified AnalyzeAsset | Gemini via Lovable AI Gateway (mode: `character`) |
| Script Enhancement | Lovable AI Gateway | Gemini (AGENT framework + Think Tool) |
| Voice (TTS) | ElevenLabs | `eleven_multilingual_v2` |
| Voice (Clone) | ElevenLabs | Instant Voice Clone + `eleven_multilingual_v2` |
| Base Video | Kie AI | Kling 2.6 image-to-video |
| Lip-Sync (Draft) | Fal.ai | ByteDance LatentSync (`fal-ai/latentsync`) |
| Lip-Sync (Production) | Fal.ai | Sync Labs Lipsync 2.0 (`fal-ai/sync-lipsync`) |
| Music (optional) | Kie AI | Suno V4 |
| Assembly | Fal AI | FFmpeg API |

---

## Cost Breakdown (per 30-second video)

| Component | Draft Tier | Production Tier |
|-----------|-----------|-----------------|
| Voice (TTS) | ~$0.03 | ~$0.03 |
| Base Video (Kling 2.6) | ~$0.12 | ~$0.12 |
| Lip-Sync | ~$0.15 (LatentSync) | ~$0.35 (Sync Labs) |
| Music (optional) | ~$0.07 | ~$0.07 |
| Assembly (FFmpeg) | ~$0.02 | ~$0.02 |
| **Total (no music)** | **~$0.30** | **~$0.50** |
| **Total (with music)** | **~$0.37** | **~$0.57** |

---

## Key Design Notes

1. **Audio-driven, not text-driven**: The lip-sync model animates from audio, not from text prompts — this is why quality jumps from 5-6/10 to 8-9/10
2. **Kling 2.6 for idle motion only**: We don't ask Kling to generate speech — just natural idle movement. This is a much simpler task it handles well.
3. **Voice as brand asset**: Cloned voices are stored as permanent brand assets, reusable across all pipelines that need voiceover
4. **Sora2 demoted to B-roll**: Sora2/Sora2-Pro can still be used for creative B-roll clips that don't require lip-sync (e.g., product shots, scene transitions)
5. **Base video reusability**: The idle motion base video can be reused with different scripts/audio, reducing cost for repeat content
6. **ElevenLabs handles multilingual**: `eleven_multilingual_v2` supports 29 languages — spokesperson videos work globally

---

## Brandflow Implementation Notes

1. **Voice clone onboarding**: Add "Record your voice" step to brand onboarding flow — 30-second sample → ElevenLabs clone → stored as `brand_assets.voice_clone_id`
2. **Photo validation**: Pre-check uploaded photos before entering the pipeline — reject side profiles, group shots, low-res images early
3. **Preview mode**: Generate a 5-second draft lip-sync preview before committing to full production generation
4. **Script templates**: Offer industry-specific script templates from the Hook Library to reduce blank-page friction
5. **Batch mode**: Allow users to generate multiple videos with the same photo but different scripts (reuse base video)

---

## Enterprise Engine Integration

> Applied from Cross-Family Engine Audit — standardizes this pipeline with enterprise-grade shared modules.

### 1. Asset Analyzer (Stage 2)
- Unified `AnalyzeAsset` Edge Function (mode: `character`)
- Validates photo suitability for lip-sync (frontal face, resolution, lighting)
- Extracts character visual details for brand context

### 2. Creative Director Agent (Stage 3)
- AGENT framework with Think Tool for script enhancement
- Incorporates Hook Library data for industry-relevant openings
- Generates caption and title alongside enhanced script

### 3. Plan Review Gate (Stage 3.5)
- User previews enhanced script, voice sample, photo, and cost estimate
- Editable script with real-time duration estimation
- Prevents expensive generation on unapproved content

### 4. Revision Loop (Stage 3.6)
- RevisionAgent incorporates user feedback into script revisions
- Preserves brand voice and hook effectiveness across iterations
- Max 3 cycles before manual entry

### 5. Core Elements Board Injection
- Brand's Core Elements Board image provides visual context for script enhancement
- Helps Creative Director understand product/brand setting
- Optional — skipped if brand has no Board

### 6. Hook Library Integration
- Queries `hooks` table for top-performing hooks in user's industry BEFORE script enhancement
- Injects proven opening patterns into the Creative Director's context
- Tracks which hooks are used for performance feedback loop

### 7. Music Engine (Optional, Parallel Lane)
- Suno V4 via Kie AI generates background music matching script mood
- Runs in parallel with voice + base video generation
- Music overlay at 25% volume in Assembly stage

### 8. Assembly Engine (Stage 5E)
- Fal AI FFmpeg API for audio mixing + video assembly
- Handles: voice + music mixing, caption burn-in, aspect ratio enforcement
- Automated — no manual post-production needed

### 9. Re-entry Controller
- Resume from any stage via `job_stages` status:
  - `brief_intake` → `script_enhancement` → `plan_review` → `voice_generation` → `base_video` → `lip_sync` → `assembly` → `delivery`
- If lip-sync fails: retry with same audio + base video
- If user re-records voice: re-run from voice generation onward
- Base video cached for script-only changes

### 10. Tier Router

| Tier | Lip-Sync Model | Cost | Quality |
|------|----------------|------|---------|
| **Draft** | ByteDance LatentSync (`fal-ai/latentsync`) | ~$0.20/40s | 7/10 |
| **Production** | Sync Labs Lipsync 2.0 (`fal-ai/sync-lipsync`) | ~$0.70/min | 9/10 |

- Draft auto-selected for preview generation
- Production used after final approval
- Kling 2.6 stays constant across tiers (idle motion quality is sufficient)

### 11. SEALCaM Prompting
- Not applicable for lip-sync pipeline (audio-driven, not prompt-driven)
- Available for optional Sora2 B-roll generation if user wants supplementary creative clips

### 12. Brand Voice DNA Integration

Inject `voice_signature.json` into Stage 3 script enhancement:
- Prepend `## Brand Voice Context` block to the Script Director agent's system prompt
- Ensures spokesperson scripts match brand tone, vocabulary, and CTA patterns
- Platform variations applied based on target distribution platform
- See `engines/BRAND_VOICE_DNA_ENGINE.md` for full schema and injection contract

### 13. Motion Variant Selector (upgrades Stage 5B)

Generate 3 Kling 2.6 idle-motion candidates instead of 1:
- 3 different motion prompts (breathing, head micro-movements, expression evolution)
- Score each: `naturalness_score`, `gesture_density_score`, `lip_sync_alignment_score`
- Auto-select highest composite score; user can override via Plan Review Gate
- 3x base video cost (~$0.36 vs ~$0.12) but dramatically reduces stiffness risk
- See `engines/SPOKESPERSON_MOTION_VARIANT_ENGINE.md` for scoring system and prompt variants

### 14. Provider Routing

All provider calls route through the Provider Routing Layer:
- Video: Kie AI Kling → Fal.ai Kling (fallback chain)
- Lip-sync: Sync Labs → LatentSync → Wav2Lip (fallback chain)
- Voice: ElevenLabs direct (no fallback — unique capability)
- See `engines/PROVIDER_ROUTING_POLICY.md` for health-check and failover logic

### 15. Delivery & Post-Production (Module #17)

After Assembly, output passes through Module #17 for enterprise-grade finishing:
- **Auto-Subtitles**: ✅ (burned-in or sidecar — critical for talking-head content)
- **Dubbing**: ✅ (ElevenLabs Dubbing API preserves speaker voice across 29+ languages)
- **Audio Polish**: ✅ (loudness normalization, noise reduction, music ducking)
- **Video Enhancement**: ✅ (upscale, denoise AI artifacts, color grading)
- **Thumbnails**: ✅ (auto-extracted + brand overlay)
- **Watermark**: ✅ (review versions watermarked, stream-only, 7-day expiry)
- **Export**: ✅ (multi-format, multi-platform presets)
- Review version shown at Plan Review Gate (#2); production version unlocked on approval
- See `engines/DELIVERY_POST_PRODUCTION_ENGINE.md` for full specification
