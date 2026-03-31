# UGC Voiceover Extension — Technical Reference

> **Status**: Design reference — not yet implemented  
> **Owner**: F1 UGC Video Pipeline  
> **Purpose**: Add optional voice overlay lane to UGC videos for narration realism

---

## Overview

F1 UGC currently produces silent video clips (Veo3 generates audio from dialogue prompts, but quality is inconsistent). This extension adds an optional `VoiceOverlayLane` that generates professional voiceover using ElevenLabs, running in parallel with video generation.

---

## Architecture

```text
After Scene Planning (Stage 3) — parallel lanes:

Lane A: Image → Video Generation (existing)
Lane B: Voice Overlay (NEW, optional)
  ├─ Script auto-generation from scene descriptions
  ├─ Voice style matching to UGC archetype
  └─ ElevenLabs TTS generation

Both lanes → Assembly Engine → Final video with voice + optional music
```

---

## Voice Overlay Lane

### Step 1: Script Auto-Generation

If user provides dialogue in the brief, use it directly. Otherwise, auto-generate from scene descriptions:

**Provider**: Gemini via Lovable AI Gateway

**Input**: Scene prompts from Stage 3 (image_prompt + video_prompt per scene)

**Output**: Natural, casual voiceover script that matches UGC aesthetic:
```json
{
  "full_script": "So I literally just discovered this and... okay it actually works? Like the texture is insane...",
  "per_scene_scripts": [
    { "scene": 1, "script": "So I literally just discovered this and...", "duration_est": "3s" },
    { "scene": 2, "script": "okay it actually works?", "duration_est": "2s" }
  ],
  "total_duration_est": "12s"
}
```

### Step 2: Voice Persona Selection

Map UGC archetype to curated ElevenLabs voice:

| Persona | Description | Voice Style | Use Case |
|---------|-------------|-------------|----------|
| Young Creator | Gen-Z casual, enthusiastic | Upbeat, slightly breathy | Product discovery, trending |
| Expert Friend | Knowledgeable but approachable | Warm, confident | Tips, how-tos, reviews |
| Honest Reviewer | Authentic, unscripted feel | Natural pace, slight hesitation | Testimonials, before-after |
| Storyteller | Narrative, engaging | Measured pace, expressive | Founder stories, brand stories |

**Selection logic**:
- Auto-matched from brief `special_requests` or scene mood
- User can override in brief settings
- Brand-level default persona stored in `brand_profiles`

### Step 3: TTS Generation (via Voice Management Engine #20)

> **IMPORTANT**: UGC Voiceover Extension does NOT call providers directly.  
> All TTS operations are delegated to the **Voice Management Engine (#20)**, which owns provider selection, quality scoring, and audio normalization.

**Call**: `VoiceEngine.generateSpeech()`
- `voice_id`: Resolved from persona mapping (Step 2) via #20's preset registry
- `style`: `conversational` (default for UGC)
- `language`: From brief or auto-detected
- `speed`: 1.0 (default)

**#20 handles internally**:
- Provider selection (ElevenLabs primary, Azure TTS fallback)
- Model selection (`eleven_multilingual_v2` or equivalent)
- Voice stem normalization to -16 LUFS
- Quality scoring and `approved_for_use` validation

**Output**: MP3 audio URL returned by #20, stored in Supabase Storage.

---

## Assembly Integration

When voice overlay is enabled, the Assembly Engine mixes:
- **Voice audio**: 100% volume
- **Background music** (if enabled): 25% volume
- **Video audio** (from Veo3): 0% volume (muted — replaced by ElevenLabs voice)

```bash
ffmpeg -i video.mp4 -i voice.mp3 -i music.mp3 \
  -filter_complex "[1:a]volume=1.0[vo];[2:a]volume=0.25[bg];[vo][bg]amix=inputs=2[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -shortest output.mp4
```

---

## F1 Pipeline Integration

### New Optional Stage 6B (parallel to video generation)

```text
Stage 3: Scene Planning
  ↓
Stage 4: Split Scenes → per-scene processing
  ↓
[PARALLEL]
  Lane A: Stage 5 (Image) → Stage 6 (Video) → existing flow
  Lane B: Stage 6B (Voice Overlay) → ElevenLabs TTS
  ↓
Stage 7: Assembly Engine (merge video + voice + music)
```

### Updated Brief Intake Fields

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `voice_overlay` | boolean | No | false |
| `voice_persona` | enum | If voice_overlay=true | `young_creator` |
| `voice_script` | string | No | Auto-generated from scenes |

---

## Cost Impact

| Component | Cost per 30s video |
|-----------|-------------------|
| ElevenLabs TTS | ~$0.03-0.06 |
| Script generation | ~$0.01 |
| Assembly (FFmpeg) | ~$0.02 |
| **Total voice overlay addon** | **~$0.06-0.09** |

Minimal cost impact — high value for perceived quality.

---

## Key Design Notes

1. **Optional, not default** — UGC videos work fine silent (Veo3 dialogue) but voice overlay dramatically improves quality
2. **Mute Veo3 audio** — when voice overlay is active, the Veo3-generated audio is discarded and replaced
3. **Script must match video duration** — Assembly Engine handles timing sync via `-shortest` flag
4. **Voice clone integration** — if brand has a cloned voice (from F2 Spokesperson onboarding), it can be used here too
5. **Per-scene timing** — for Variant B (merged clips), ensure voice script segments align with clip boundaries
