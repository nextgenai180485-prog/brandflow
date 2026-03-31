# Module #20 — Voice Management Engine

> **Status**: Design reference  
> **Last updated**: 2026-03-31  
> **Owner**: Cross-family  
> **Depends on**: Module #9 (Provider & Tier Routing)

---

## Purpose

Provide a single abstraction layer for all voice operations across Brandflow: TTS generation, voice cloning, voice presets, dubbing, and voice-over workflows.

Currently, voice logic is scattered across:
- Module #16 (UGC Voiceover Extension) — F1-specific
- Module #15 (Motion Variant Selector) — F2-specific TTS
- Module #18 (Localization) — dubbing
- Individual pipeline docs — ad-hoc ElevenLabs calls

This engine unifies all voice operations behind one interface so every family gets consistent voice quality, preset management, and provider abstraction.

---

## Voice Operations

### 1. Text-to-Speech (TTS)

Convert script text to spoken audio.

```json
{
  "operation": "tts",
  "input": {
    "text": "string",
    "voice_id": "string (preset or cloned)",
    "language": "string (BCP-47)",
    "style": "neutral | conversational | dramatic | whisper | energetic",
    "speed": 1.0,
    "pitch_shift": 0
  },
  "output": {
    "audio_url": "string",
    "duration_s": "number",
    "sample_rate": 44100,
    "format": "mp3 | wav"
  }
}
```

### 2. Voice Cloning

Create a reusable voice profile from audio samples.

```json
{
  "operation": "clone",
  "input": {
    "samples": ["audio_url_1", "audio_url_2"],
    "voice_name": "string",
    "brand_id": "uuid",
    "consent_confirmed": true
  },
  "output": {
    "voice_id": "string",
    "quality_score": "number (0-100)",
    "usable": true,
    "warnings": ["string"]
  }
}
```

### 3. Voice Presets

Manage a library of reusable voice configurations.

```json
{
  "voice_preset": {
    "preset_id": "uuid",
    "brand_id": "uuid",
    "name": "string",
    "type": "stock | cloned | uploaded",
    "provider": "elevenlabs | azure_tts | google_tts",
    "provider_voice_id": "string",
    "default_style": "conversational",
    "default_speed": 1.0,
    "language_support": ["en-US", "es-ES", "ar-SA"],
    "quality_score": "number (0-100)",
    "approved_for_use": true,
    "persona_match": {
      "archetype": "professional | friendly | authoritative | playful | calm | energetic",
      "tone_profile": "string (ref: Brand Voice DNA #12 voice_signature)",
      "gender": "male | female | neutral",
      "age_range": "young | mid | mature"
    },
    "created_at": "ISO 8601"
  }
}
```

### 4. Dubbing

Generate dubbed audio in target languages (coordinates with Module #18 Localization).

```json
{
  "operation": "dub",
  "input": {
    "source_audio_url": "string",
    "source_language": "string (BCP-47)",
    "target_language": "string (BCP-47)",
    "voice_id": "string (target voice preset)",
    "preserve_timing": true,
    "lip_sync_required": false
  },
  "output": {
    "dubbed_audio_url": "string",
    "duration_s": "number",
    "timing_map": [
      { "source_start": 0.0, "source_end": 2.5, "target_start": 0.0, "target_end": 2.8 }
    ]
  }
}
```

### 5. Audio Upload & Normalization

Accept user-uploaded voice recordings and normalize them.

```json
{
  "operation": "upload_normalize",
  "input": {
    "upload_url": "string",
    "target_loudness_lufs": -16,
    "noise_reduction": true,
    "trim_silence": true
  },
  "output": {
    "normalized_audio_url": "string",
    "duration_s": "number",
    "quality_assessment": {
      "noise_level": "low | medium | high",
      "clipping_detected": false,
      "usable": true
    }
  }
}
```

---

## Provider Abstraction

The Voice Management Engine routes through Module #9 (Provider & Tier Routing):

| Operation | Primary Provider | Fallback Provider |
|-----------|-----------------|-------------------|
| TTS | ElevenLabs | Azure TTS |
| Voice Cloning | ElevenLabs | — (no fallback, quality-critical) |
| Dubbing | ElevenLabs (Dubbing API) | Azure Speech Translation |
| Audio Normalization | BytePlus VOD (audio workflow) | FFmpeg (local) |
| Audio Enhancement | BytePlus VOD | FFmpeg (local) |

### Provider Interface

All providers implement this interface:

```typescript
interface VoiceProvider {
  generateSpeech(params: TTSParams): Promise<AudioResult>;
  cloneVoice(params: CloneParams): Promise<VoiceProfile>;
  dubAudio(params: DubParams): Promise<AudioResult>;
  listVoices(): Promise<VoicePreset[]>;
  getVoice(voiceId: string): Promise<VoicePreset>;
}
```

---

## Voice Quality Pipeline

Every generated audio passes through a quality pipeline before delivery:

```
Raw TTS Output
  → Loudness Normalization (-16 LUFS)
  → Noise Gate (remove artifacts)
  → EQ Polish (presence boost 2-4kHz)
  → Compression (gentle, broadcast-standard)
  → Final Output
```

For **draft** tier: Skip EQ and compression (speed priority).  
For **standard** tier: Full pipeline.  
For **premium** tier: Full pipeline + human QA flag.

---

## Cross-Family Adoption

| Family | Voice Operations Used |
|--------|----------------------|
| F1 UGC Video | TTS, Upload, Presets (via Module #16) |
| F2 AI Spokesperson | TTS, Cloning, Upload, Presets |
| F3 Product Videography | TTS (optional narration) |
| F4 Social Content | — (text-only output) |
| F5 Cinematic Ad | TTS, Cloning, Presets, Dubbing |
| F6 Core Elements Board | — |
| F7 Ad Creator | TTS (optional), Presets |
| F8 Creative Cloner | TTS, Cloning, Presets |
| F9 Image Template | — |

---

## Relationship to Existing Modules

| Module | Relationship |
|--------|-------------|
| #16 UGC Voiceover Extension | Becomes a **consumer** of Voice Engine — UGC-specific workflow logic stays in #16, but voice generation calls route through #20 |
| #15 Motion Variant Selector | Uses Voice Engine for F2 TTS instead of direct provider calls |
| #18 Localization Engine | Calls Voice Engine's dubbing operation for dubbed versions |
| #17 Post-Production | Calls Voice Engine's normalization for audio polish |
| #8 Assembly Engine | Receives finalized audio tracks from Voice Engine |

---

## Database Schema

```sql
CREATE TABLE voice_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'stock' | 'cloned' | 'uploaded'
  provider TEXT NOT NULL,
  provider_voice_id TEXT NOT NULL,
  default_style TEXT DEFAULT 'neutral',
  default_speed NUMERIC DEFAULT 1.0,
  language_support TEXT[] DEFAULT '{}',
  consent_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (brand_id, name)
);

CREATE TABLE voice_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  preset_id UUID REFERENCES voice_presets(id),
  operation TEXT NOT NULL, -- 'tts' | 'dub' | 'normalize'
  input_params JSONB NOT NULL,
  output_url TEXT,
  duration_s NUMERIC,
  cost_usd NUMERIC,
  provider TEXT NOT NULL,
  tier TEXT NOT NULL, -- 'draft' | 'standard' | 'premium'
  created_at TIMESTAMPTZ DEFAULT now()
);
```
