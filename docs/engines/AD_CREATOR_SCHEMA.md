# Ad Creator Prompt Schema — Technical Reference

> **Status**: Design reference — not yet implemented  
> **Owner**: F7 Ad Creator Pipeline  
> **Purpose**: Replace stringified JSON video prompts with a structured nested object schema

---

## Overview

F7 Ad Creator currently outputs `video_prompt` as a stringified JSON string inside the output JSON — requiring double-serialization handling and making prompts fragile. This schema normalizes video prompts to a nested object aligned with the SEALCaM standard.

---

## Problem

Current F7 output:
```json
{
  "image_prompt": "A perfume bottle on marble...",
  "video_prompt": "{\"description\":\"Scene starts with...\",\"setting\":\"Noir studio\",\"camera_type\":\"Steadicam\",\"camera_movement\":\"slow dolly\",\"action\":\"light sweeps across bottle\",\"lighting\":\"dramatic side lighting\",\"other_details\":\"film grain\",\"dialogue\":\"\",\"music\":\"ambient noir\",\"ending\":\"fade to black\",\"keywords\":[\"luxury\",\"noir\"]}",
  "caption": "...",
  "creative_summary": "..."
}
```

Problems:
- Double-serialized JSON is brittle (escaping issues)
- Not aligned with SEALCaM standard used by F5, F8
- Downstream video generation must parse the string before use
- Debugging stringified JSON is painful

---

## Solution: Nested Object Schema

### Updated Output Schema

```json
{
  "image_prompt": {
    "subject": "Premium perfume bottle, cut glass, amber liquid",
    "environment": "Marble surface, noir studio, dark backdrop",
    "lighting": "Dramatic side lighting, single key light, deep shadows",
    "camera": "Close-up, shallow depth of field, 85mm equivalent",
    "composition": "Center-weighted, negative space left, bottle fills 60% frame",
    "style": "Editorial luxury photography, film grain, high contrast"
  },
  "video_prompt": {
    "subject": "Perfume bottle centered in frame, light interaction",
    "environment": "Noir studio, marble surface, dark ambient",
    "action": "Light slowly sweeps across bottle, refractions dance on marble",
    "lighting": "Dramatic side lighting transitions to soft front fill",
    "camera": "Slow dolly forward, slight tilt up, Steadicam smoothness",
    "metatokens": "luxury_product_hero, film_grain, cinematic_color_grade, 24fps_motion"
  },
  "caption": "Darkness reveals beauty ✨ #luxury #perfume",
  "creative_summary": "📢 Noir-inspired perfume reveal...\n🖼️ IMAGE: ...\n🎬 VIDEO: ...",
  "aspect_ratio": "9:16",
  "video_model": "veo3_fast"
}
```

### SEALCaM Alignment

| Old Field (Stringified) | New Field (Nested) | SEALCaM Field |
|------------------------|-------------------|---------------|
| `description` | `subject` | Subject |
| `setting` | `environment` | Environment |
| `action` | `action` | Action |
| `lighting` | `lighting` | Lighting |
| `camera_type` + `camera_movement` | `camera` | Camera |
| `other_details` + `keywords` | `metatokens` | Metatokens |
| `dialogue` | removed (separate field if needed) | — |
| `music` | removed (handled by Music Engine) | — |
| `ending` | merged into `action` | — |

---

## Migration in F7 Pipeline

### Stage 3 Update

The Creative Director Agent's system prompt is updated to output nested objects instead of stringified JSON:

**Before** (system prompt excerpt):
```
video_prompt (stringified JSON) must include:
  description, setting, camera_type, camera_movement, action, lighting...
```

**After** (system prompt excerpt):
```
video_prompt (nested object) must include SEALCaM fields:
  subject: What is the focal point of the video
  environment: Setting, background, atmosphere
  action: What happens during the clip
  lighting: Light sources, direction, mood
  camera: Camera type, movement, angle
  metatokens: Style keywords, film characteristics, post-processing
```

### Stage 6 Update

Video generation now reads structured fields directly:

**Before**:
```javascript
const videoPrompt = JSON.parse(output.video_prompt); // fragile
const prompt = videoPrompt.description + " " + videoPrompt.setting + ...;
```

**After**:
```javascript
const { subject, environment, action, lighting, camera, metatokens } = output.video_prompt;
const prompt = `${subject}. ${environment}. ${action}. ${lighting}. ${camera}. ${metatokens}`;
```

---

## Key Design Notes

1. **Backward compatible** — existing jobs with stringified JSON still parse correctly; new jobs use nested objects
2. **SEALCaM alignment** enables template reuse across F5, F7, F8
3. **Music and dialogue removed from video prompt** — handled by separate Music Engine and voice lanes
4. **Image prompt also gets structured** — while not stringified before, it benefits from SEALCaM alignment too
5. **The `metatokens` field** is the catch-all for style, mood, keywords — keeps the schema clean
