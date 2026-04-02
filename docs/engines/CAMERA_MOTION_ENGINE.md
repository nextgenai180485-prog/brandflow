# Camera Motion & Transition Engine — Technical Reference (Module #24)

> **Status**: Design reference — not yet implemented  
> **Owner**: Cross-family shared module  
> **Purpose**: Replace freeform camera text hints with structured motion vocabulary, scene transitions, and provider-specific translation

---

## Overview

All video families currently describe camera motion as freeform text (e.g., `"SLOW movement"`, `"dolly in slowly"`). This engine introduces a **structured camera motion vocabulary** and **scene transition schema** that:

1. Define a controlled set of camera moves with intensity parameters
2. Map structured parameters to provider-specific prompt syntax
3. Enable Creative Direction Engine (#23) to output precise cinematic instructions
4. Give the Assembly Engine (#8) explicit transition types instead of AI interpretation

---

## Camera Motion Schema

```typescript
interface CameraMotion {
  move_type: CameraMoveType;
  intensity: number;            // 0.0 (imperceptible) – 1.0 (dramatic)
  speed_curve: SpeedCurve;
  start_angle_deg?: number;     // optional, e.g. 0
  end_angle_deg?: number;       // optional, e.g. 45
  focus_pull?: FocusPull;       // optional rack focus
}

type CameraMoveType =
  | 'STATIC'
  | 'DOLLY_IN'
  | 'DOLLY_OUT'
  | 'PAN_LEFT'
  | 'PAN_RIGHT'
  | 'TILT_UP'
  | 'TILT_DOWN'
  | 'CRANE_UP'
  | 'CRANE_DOWN'
  | 'TRACKING_LEFT'
  | 'TRACKING_RIGHT'
  | 'ORBIT_CW'
  | 'ORBIT_CCW'
  | 'HANDHELD'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'RACK_FOCUS'
  | 'WHIP_PAN';

type SpeedCurve = 'LINEAR' | 'EASE_IN' | 'EASE_OUT' | 'EASE_IN_OUT';

interface FocusPull {
  from: 'FOREGROUND' | 'MIDGROUND' | 'BACKGROUND';
  to: 'FOREGROUND' | 'MIDGROUND' | 'BACKGROUND';
  at_seconds: number;
}
```

### Intensity Scale Reference

| Intensity | Label | Description | Example |
|-----------|-------|-------------|---------|
| 0.0–0.2 | Imperceptible | Barely noticeable movement, breathing camera | Product macro with micro-drift |
| 0.2–0.4 | Subtle | Gentle, calm movement | Slow dolly on talking head |
| 0.4–0.6 | Moderate | Clearly visible, controlled motion | Standard tracking shot |
| 0.6–0.8 | Dynamic | Energetic, noticeable camera work | Fast pan across scene |
| 0.8–1.0 | Dramatic | Aggressive, high-energy movement | Whip pan, crash zoom |

### Move Type Definitions

| Move Type | Description | Best For |
|-----------|-------------|----------|
| `STATIC` | Locked-off camera, no movement | Product hero shots, authority frames |
| `DOLLY_IN` | Camera physically moves toward subject | Reveal, emphasis, intimacy |
| `DOLLY_OUT` | Camera physically moves away from subject | Context reveal, ending shots |
| `PAN_LEFT` / `PAN_RIGHT` | Camera rotates horizontally on axis | Scene scanning, following action |
| `TILT_UP` / `TILT_DOWN` | Camera rotates vertically on axis | Reveal height, product scanning |
| `CRANE_UP` / `CRANE_DOWN` | Camera moves vertically through space | Dramatic reveals, establishing shots |
| `TRACKING_LEFT` / `TRACKING_RIGHT` | Camera moves laterally with subject | Following walking subjects |
| `ORBIT_CW` / `ORBIT_CCW` | Camera circles around subject | Product 360°, hero moments |
| `HANDHELD` | Simulated natural hand shake | UGC authenticity, documentary feel |
| `ZOOM_IN` / `ZOOM_OUT` | Lens zoom (not physical move) | Quick emphasis, dramatic reveal |
| `RACK_FOCUS` | Focus shifts between depth planes | Attention redirect, cinematic depth |
| `WHIP_PAN` | Extremely fast horizontal pan | Scene transitions, energy bursts |

---

## Scene Transition Schema

```typescript
interface SceneTransition {
  type: TransitionType;
  duration_ms: number;          // 0 for CUT, 500-2000 for dissolves
  direction?: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';  // for WIPE/WHIP_PAN only
}

type TransitionType =
  | 'CUT'               // Instant switch — 0ms
  | 'DISSOLVE'          // Gradual opacity blend — 500-1500ms
  | 'CROSS_DISSOLVE'    // Overlapping dissolve — 500-2000ms
  | 'MATCH_CUT'         // Shape/motion continuity cut — 0ms visual, conceptual link
  | 'WHIP_PAN'          // Fast pan blur between scenes — 300-800ms
  | 'FADE_TO_BLACK'     // Scene fades to black — 500-1500ms
  | 'FADE_FROM_BLACK'   // Scene emerges from black — 500-1500ms
  | 'WIPE'              // Edge wipe in direction — 500-1500ms
  | 'MORPH'             // Subject/shape morphing — 1000-2000ms
  | 'JUMP_CUT';         // Same angle, time skip — 0ms (UGC style)
```

### Transition Type Guidelines

| Type | Duration | Use Case | FFmpeg Filter |
|------|----------|----------|---------------|
| `CUT` | 0ms | Most scenes, fast pacing | Direct concat |
| `DISSOLVE` | 500-1500ms | Emotional transitions, time passage | `xfade=transition=fade` |
| `CROSS_DISSOLVE` | 500-2000ms | Smooth scene bridges | `xfade=transition=dissolve` |
| `MATCH_CUT` | 0ms | Premium storytelling, visual rhyme | Custom compositing |
| `WHIP_PAN` | 300-800ms | Energy, excitement, scene change | `xfade=transition=wipeleft` + motion blur |
| `FADE_TO_BLACK` | 500-1500ms | Chapter endings, dramatic pauses | `xfade=transition=fade:color=black` |
| `FADE_FROM_BLACK` | 500-1500ms | Openings, new chapters | `xfade=transition=fade:color=black` |
| `WIPE` | 500-1500ms | Playful, retro, social | `xfade=transition=wipeleft/wiperight` |
| `MORPH` | 1000-2000ms | Premium effects, product transforms | Provider-dependent |
| `JUMP_CUT` | 0ms | UGC authenticity, vlog style | Direct concat |

---

## Interpolation Control Schema

Controls how video providers bridge start and end frames within a scene:

```typescript
interface Interpolation {
  style: InterpolationStyle;
  easing: 'EASE_IN' | 'EASE_OUT' | 'EASE_IN_OUT' | 'LINEAR';
  mid_keyframe_hint?: string;   // optional text hint for mid-scene
}

type InterpolationStyle =
  | 'LINEAR'      // Even motion throughout
  | 'SMOOTH'      // Natural, organic motion
  | 'DRAMATIC'    // High contrast, tension-release
  | 'DREAMY';     // Slow, ethereal, floating
```

---

## Provider Translation Layer

Maps structured `CameraMotion` parameters to provider-specific prompt syntax.

### Veo3 (Kie AI) — Natural Language Translation

Veo3 interprets camera instructions from natural language. The translation layer converts structured params to optimized text.

```typescript
function translateToVeo3(motion: CameraMotion): string {
  const intensityWord = getIntensityWord(motion.intensity);
  // intensityWord: 0.0-0.2 = "very subtly", 0.2-0.4 = "gently", 
  //                0.4-0.6 = "steadily", 0.6-0.8 = "dynamically", 0.8-1.0 = "dramatically"
  
  const movePhrase = VEO3_MOVE_MAP[motion.move_type];
  // DOLLY_IN → "dolly forward toward the subject"
  // ORBIT_CW → "orbit clockwise around the subject"
  // HANDHELD → "handheld camera with natural shake"
  // RACK_FOCUS → "pull focus"
  
  const curvePhrase = VEO3_CURVE_MAP[motion.speed_curve];
  // EASE_IN → "starting slowly and building speed"
  // EASE_OUT → "gradually slowing to a stop"
  // EASE_IN_OUT → "with smooth acceleration and deceleration"
  
  let prompt = `${intensityWord} ${movePhrase}`;
  if (motion.speed_curve !== 'LINEAR') prompt += `, ${curvePhrase}`;
  if (motion.focus_pull) {
    prompt += `. Rack focus from ${motion.focus_pull.from.toLowerCase()} to ${motion.focus_pull.to.toLowerCase()} at ${motion.focus_pull.at_seconds}s`;
  }
  
  return prompt;
}
```

**Example outputs**:
- `{ move_type: 'DOLLY_IN', intensity: 0.3, speed_curve: 'EASE_IN_OUT' }` → `"gently dolly forward toward the subject, with smooth acceleration and deceleration"`
- `{ move_type: 'ORBIT_CW', intensity: 0.7, speed_curve: 'LINEAR' }` → `"dynamically orbit clockwise around the subject"`
- `{ move_type: 'HANDHELD', intensity: 0.2, speed_curve: 'LINEAR' }` → `"very subtly handheld camera with natural shake"`

### Kling 2.6 (WaveSpeed / Kie AI) — Structured Parameters

Kling supports structured motion hints through prompt engineering:

```typescript
function translateToKling(motion: CameraMotion): string {
  // Kling responds well to direct camera terminology
  const move = KLING_MOVE_MAP[motion.move_type];
  const speed = motion.intensity < 0.4 ? 'slow' : motion.intensity < 0.7 ? 'medium' : 'fast';
  return `Camera: ${speed} ${move}. ${motion.speed_curve === 'EASE_IN_OUT' ? 'Smooth motion.' : ''}`;
}
```

### Runway Gen-4 — Motion Presets

Runway uses named presets + intensity values:

```typescript
function translateToRunway(motion: CameraMotion): RunwayMotionConfig {
  return {
    camera_motion: RUNWAY_PRESET_MAP[motion.move_type],
    motion_intensity: motion.intensity,
    // Runway natively supports: dolly_in, dolly_out, pan_left, pan_right, 
    // tilt_up, tilt_down, zoom_in, zoom_out, orbit, static
  };
}
```

### Provider Camera Capability Matrix

| Move Type | Veo3 | Kling 2.6 | Runway Gen-4 | Seedance 1.0 |
|-----------|------|-----------|---------------|--------------|
| `STATIC` | ✅ | ✅ | ✅ | ✅ |
| `DOLLY_IN` | ✅ | ✅ | ✅ native | ✅ |
| `DOLLY_OUT` | ✅ | ✅ | ✅ native | ✅ |
| `PAN_LEFT/RIGHT` | ✅ | ✅ | ✅ native | ✅ |
| `TILT_UP/DOWN` | ✅ | ✅ | ✅ native | ⚠️ partial |
| `CRANE_UP/DOWN` | ✅ | ⚠️ text-only | ⚠️ via zoom | ❌ |
| `TRACKING_LEFT/RIGHT` | ✅ | ⚠️ text-only | ✅ native | ⚠️ partial |
| `ORBIT_CW/CCW` | ✅ | ✅ | ✅ native | ⚠️ partial |
| `HANDHELD` | ✅ | ✅ | ⚠️ no native | ❌ |
| `ZOOM_IN/OUT` | ✅ | ✅ | ✅ native | ✅ |
| `RACK_FOCUS` | ⚠️ text hint | ❌ | ❌ | ❌ |
| `WHIP_PAN` | ⚠️ text hint | ❌ | ⚠️ via fast pan | ❌ |

**Legend**: ✅ = reliable, ⚠️ = best-effort via text/workaround, ❌ = not supported

### Fallback Rules

When a requested `move_type` is not supported by the active provider:

```typescript
const FALLBACK_MOVES: Record<CameraMoveType, CameraMoveType> = {
  'CRANE_UP': 'TILT_UP',        // vertical rotation approximates crane
  'CRANE_DOWN': 'TILT_DOWN',
  'TRACKING_LEFT': 'PAN_LEFT',  // rotation approximates lateral tracking
  'TRACKING_RIGHT': 'PAN_RIGHT',
  'WHIP_PAN': 'PAN_LEFT',       // fast pan at high intensity
  'RACK_FOCUS': 'STATIC',       // degrade gracefully
  'MORPH': 'DISSOLVE',          // transition fallback
};
```

---

## Scene Transition Implementation

### FFmpeg Transition Mapping

Transitions between scenes are handled in the Assembly Engine (#8) using FFmpeg `xfade` filter:

```bash
# DISSOLVE (1000ms)
ffmpeg -i scene1.mp4 -i scene2.mp4 \
  -filter_complex "[0][1]xfade=transition=fade:duration=1:offset=4" \
  -c:a copy output.mp4

# WHIP_PAN LEFT (500ms)
ffmpeg -i scene1.mp4 -i scene2.mp4 \
  -filter_complex "[0][1]xfade=transition=wipeleft:duration=0.5:offset=4.5" \
  -c:a copy output.mp4

# FADE_TO_BLACK (1000ms) — requires intermediate black frame
ffmpeg -i scene1.mp4 -i scene2.mp4 \
  -filter_complex "[0]fade=t=out:st=4:d=0.5[v0];[1]fade=t=in:st=0:d=0.5[v1];[v0][v1]concat=n=2:v=1:a=0" \
  -c:a copy output.mp4
```

### Transition Selection Guidelines

| Ad Type | Recommended Transitions | Notes |
|---------|------------------------|-------|
| **F1 UGC** | `JUMP_CUT`, `CUT` | Authentic, casual feel |
| **F3 Product** | `DISSOLVE`, `CUT` | Clean, professional |
| **F5 Cinematic** | `DISSOLVE`, `CROSS_DISSOLVE`, `MATCH_CUT`, `FADE_TO_BLACK` | Premium storytelling |
| **F7 Ad Creator** | `CUT`, `DISSOLVE` | Single scene, transitions only for intro/outro |
| **F8 Creative Cloner** | Match original | Preserve source transition style |

---

## Integration with SEALCaM (Module #5)

The `camera` field in SEALCaM is upgraded from a plain string to a structured `CameraMotion` object. The `buildSEALCaMPrompt()` function uses the provider translation layer to convert structured camera parameters back to text for the prompt.

```typescript
// Updated SEALCaM Scene interface
interface SEALCaMScene {
  subject: string;
  environment: string;
  action: string;
  lighting: string;
  camera_motion: CameraMotion;      // replaces camera: string
  metatokens: string;
  scene_transition?: SceneTransition;  // new: inter-scene transition
  interpolation?: Interpolation;       // new: intra-scene bridging
}
```

See `pipelines/SEALCAM_FRAMEWORK.md` for the updated framework spec.

---

## Integration with Creative Direction Engine (#23)

The Creative Direction Engine outputs `scene_architecture[]` where each scene includes:

```json
{
  "scene_id": 1,
  "purpose": "hook",
  "duration_s": 5,
  "camera_motion": {
    "move_type": "DOLLY_IN",
    "intensity": 0.4,
    "speed_curve": "EASE_IN_OUT"
  },
  "scene_transition": {
    "type": "CUT",
    "duration_ms": 0
  },
  "interpolation": {
    "style": "SMOOTH",
    "easing": "EASE_IN_OUT"
  }
}
```

The Creative Direction Engine selects camera presets based on:
- **Scene purpose**: Hook scenes get dynamic moves, CTA scenes get static
- **Ad angle**: "Urgency" angles favor faster, more dynamic camera work
- **Family**: F1 UGC defaults to `HANDHELD`, F5 Cinematic defaults to `DOLLY_IN`/`ORBIT_CW`
- **Platform**: TikTok favors dynamic camera; LinkedIn favors static/subtle

---

## Cross-Family Adoption

| Family | Camera Motion | Transitions | Interpolation | Notes |
|--------|--------------|-------------|---------------|-------|
| **F1 UGC** | ✅ | opt (single-scene) | — | Default: `HANDHELD` + `intensity: 0.3` |
| **F2 Spokesperson** | — | — | — | Lip-sync driven, not prompt-driven |
| **F3 Product** | ✅ | opt (single-scene) | ✅ | Default: `DOLLY_IN` + `intensity: 0.2` (slow macro) |
| **F5 Cinematic Ad** | ✅ ★ | ✅ ★ | ✅ ★ | Full adoption — primary beneficiary |
| **F7 Ad Creator** | ✅ | opt | ✅ | Single scene, camera motion enhances video prompt |
| **F8 Creative Cloner** | ✅ | ✅ | ✅ | Extract from source, replicate in recreation |

---

## Key Design Notes

1. **Structured → Text is lossy by design** — Provider translation produces the best possible text hint, but providers may not execute exactly as specified. This is acceptable.
2. **Fallback moves ensure graceful degradation** — If a provider doesn't support a move type, the system silently downgrades to the nearest equivalent.
3. **Intensity replaces hardcoded "SLOW"** — The old default `SLOW movement` maps to `{ move_type: 'DOLLY_IN', intensity: 0.2, speed_curve: 'EASE_IN_OUT' }`.
4. **Transitions are post-production** — Scene transitions happen in the Assembly Engine via FFmpeg, not during video generation. The provider generates clean clips; transitions are applied during stitching.
5. **Interpolation is provider-dependent** — The `interpolation` field is a hint to the video provider about how to bridge start/end frames. Not all providers respect this.
6. **MATCH_CUT requires AI planning** — A match cut needs the Creative Direction Engine to ensure visual or motion continuity between scene endings and beginnings. The Assembly Engine just does the cut; the "matching" is in the prompt design.
