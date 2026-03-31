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

## Persona Matching

The Voice Engine maps brand archetypes to voice characteristics using Brand Voice DNA (#12):

| Brand Archetype | Voice Characteristics | Recommended Style |
|-----------------|----------------------|-------------------|
| Professional / Corporate | Clear, measured pace, neutral tone | `neutral` or `conversational` |
| Friendly / Approachable | Warm, slightly faster pace, upward inflections | `conversational` or `energetic` |
| Authoritative / Premium | Deep, deliberate, confident cadence | `dramatic` or `neutral` |
| Playful / Youth | Energetic, varied pitch, casual | `energetic` or `whisper` |
| Calm / Wellness | Soft, slow, even-paced | `whisper` or `neutral` |

### Matching Flow

```
Brand Voice DNA signature
  → Extract tone_profile + personality traits
  → Map to voice archetype
  → Filter voice_presets by archetype + language
  → Rank by quality_score
  → Return top match (must have approved_for_use = true)
```

---

## Voice Quality Scoring

Every voice preset receives a quality score (0-100) based on:

| Factor | Weight | Measurement |
|--------|--------|-------------|
| Naturalness | 0.30 | MOS (Mean Opinion Score) from sample evaluation |
| Clarity | 0.25 | Signal-to-noise ratio of generated samples |
| Consistency | 0.20 | Variance across multiple generations |
| Tone alignment | 0.15 | Brand Voice DNA match score |
| Language quality | 0.10 | Pronunciation accuracy for target language |

Presets scoring below **60** are flagged for review. Presets below **40** are auto-disabled (`approved_for_use = false`).

---

## Voice Quality Pipeline

Every generated audio passes through a quality pipeline before delivery:

```
Raw TTS Output
  → Loudness Normalization (-16 LUFS)
  → Noise Gate (remove artifacts)
  → EQ Polish (presence boost 2-4kHz)
  → Compression (gentle, broadcast-standard)
  → Quality Score Assessment
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

## Ownership Boundary (Enforced)

> **Module #20 is the ONLY module that calls voice/TTS/dubbing providers.** No other module should contain provider-specific voice logic (ElevenLabs API calls, Azure TTS configuration, voice model selection, etc.).

### Consumer Modules

| Module | Relationship | What They Own | What They Delegate to #20 |
|--------|-------------|---------------|---------------------------|
| #16 UGC Voiceover Extension | **Workflow consumer** | Script auto-generation from scene descriptions, persona-to-archetype mapping | All TTS generation, provider selection, voice quality scoring |
| #15 Motion Variant Selector | **Workflow consumer** | Motion prompt generation, variant scoring | Any TTS audio needed for lip-sync input |
| #18 Localization Engine | **Dubbing requester** | Language selection, cultural tone guidance, pronunciation guides | Dubbed audio generation via `VoiceEngine.dubAudio()` |
| #17 Post-Production | **Audio integrator** | Final mix normalization (-14 LUFS), music ducking, noise reduction on final output | Receives pre-normalized voice stems (-16 LUFS) from #20 |
| #8 Assembly Engine | **Track consumer** | FFmpeg composition of video + audio tracks | Receives finalized audio tracks from #20 |

### Audio Normalization Boundary

| Stage | Owner | Target | Scope |
|-------|-------|--------|-------|
| Voice stem normalization | #20 Voice Management Engine | -16 LUFS | Individual voice/TTS tracks before assembly |
| Final mix normalization | #17 Post-Production Engine | -14 LUFS (broadcast) | Mixed output after assembly (voice + music + SFX) |

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
