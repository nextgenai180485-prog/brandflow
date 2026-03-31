# Spokesperson Motion Variant Engine — Technical Reference

> **Status**: Design reference — not yet implemented  
> **Owner**: F2 AI Spokesperson Pipeline  
> **Purpose**: Eliminate idle-motion stiffness by generating and scoring multiple motion candidates

---

## Overview

F2 AI Spokesperson uses Kling 2.6 to generate a ~5s idle motion clip from a user photo. A single generation may produce stiff, unnatural motion. This engine generates 3 candidates, scores each for naturalness, and auto-selects the best one before proceeding to lip-sync.

---

## Architecture

```text
Spokesperson Photo
  │
  ▼
Generate 3 Kling 2.6 idle-motion variants (parallel)
  │
  ├─ Variant A: "gentle blinking, slight breathing"
  ├─ Variant B: "subtle head tilt, natural eye movement"
  └─ Variant C: "slight smile progression, micro head nod"
  │
  ▼
Score each variant:
  ├─ naturalness_score (vision model assessment)
  ├─ gesture_density_score (motion analysis)
  └─ lip_sync_alignment_score (mouth neutrality check)
  │
  ▼
Auto-select best composite score
  │
  ▼
(User can override via Plan Review Gate)
  │
  ▼
Proceed to Lip-Sync (Stage 5D)
```

---

## Motion Prompt Variants

Each variant uses a slightly different idle-motion prompt to produce diverse results:

| Variant | Prompt Focus | Expected Result |
|---------|-------------|-----------------|
| A | Breathing + blinking | Minimal movement, calm presence |
| B | Head micro-movements + eye tracking | Subtle liveliness, natural gaze |
| C | Expression evolution + micro-gestures | Engaging, pre-speech anticipation |

### Prompt Templates

**Variant A**:
```
A person looking directly at the camera with subtle natural idle motion — gentle blinking, slight breathing movement. Maintain exact facial features. Neutral, calm expression. No dramatic movement. Photorealistic.
```

**Variant B**:
```
A person looking at the camera with natural presence — subtle head micro-tilt, natural eye movement tracking, slight eyebrow micro-expressions. Maintain exact facial features. Ready-to-speak expression. Photorealistic.
```

**Variant C**:
```
A person looking at the camera with engaging presence — slight smile progression, micro head nod, natural breathing. Maintain exact facial features. Warm, approachable expression about to speak. Photorealistic.
```

---

## Scoring System

### Naturalness Score (0-10)

Assessed by vision model (Gemini via Lovable AI Gateway):

```
Analyze this 5-second video clip of a person with idle motion.
Rate naturalness on a 0-10 scale:
- 9-10: Indistinguishable from real footage
- 7-8: Natural with minor AI artifacts
- 5-6: Noticeable stiffness or unnatural movement
- 3-4: Clearly AI-generated motion
- 1-2: Severe artifacts, uncanny valley

Return: { "naturalness_score": N, "issues": ["description of any artifacts"] }
```

### Gesture Density Score (0-10)

Measures amount and variety of motion:
- Too little (frozen) = low score
- Too much (jittery) = low score
- Sweet spot: subtle, varied, natural rhythm = high score

### Lip-Sync Alignment Score (0-10)

Checks that the mouth is in a neutral/closed position suitable for lip-sync overlay:
- Mouth closed or slightly parted = high score
- Mouth wide open or mid-word = low score (lip-sync will conflict)
- Teeth visible but neutral = acceptable

### Composite Score

```
composite = (naturalness × 0.5) + (gesture_density × 0.25) + (lip_sync_alignment × 0.25)
```

Naturalness weighted highest as it's the primary quality signal.

---

## F2 Pipeline Integration

### Updated Stage 5B

```text
Stage 5B: Base Video Generation
  1. Generate 3 Kling 2.6 / Seedance 2.0 variants (parallel API calls, routed by #9)
  2. Score all 3 variants (parallel vision model calls)
  3. Auto-select highest composite score
  4. Store selected variant + scores in job_stages
  5. (Optional) Show top 2 variants in Plan Review Gate for user choice
  6. Proceed to Stage 5D (Lip-Sync) with selected base video
```

> **Voice Operations**: Any TTS audio required for F2 Spokesperson (e.g., script narration for lip-sync input) is generated via the **Voice Management Engine (#20)**. This module does NOT call ElevenLabs or any TTS provider directly. See `engines/VOICE_MANAGEMENT_ENGINE.md` for the provider abstraction.

### Cost Impact

| Component | Single Generation | With Variants (3x) |
|-----------|------------------|-------------------|
| Kling 2.6 | ~$0.12 | ~$0.36 |
| Scoring (vision) | — | ~$0.03 |
| **Total** | **~$0.12** | **~$0.39** |

3x cost for base video, but this is the foundation of the entire output — worth the investment.

---

## Key Design Notes

1. **Parallel generation** — all 3 variants are generated simultaneously, no added latency
2. **Scoring is fast** — vision model assessment takes ~5 seconds per variant
3. **User override** — Plan Review Gate can show the top 2 candidates for manual selection
4. **Prompt diversity is key** — variants must produce meaningfully different motion, not just noise
5. **Cache winning variant** — if user regenerates with a different script, the base video can be reused
6. **Single variant fallback** — if budget is constrained, skip to single generation (existing behavior)
