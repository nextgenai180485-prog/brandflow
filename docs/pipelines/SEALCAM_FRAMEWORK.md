# SEALCaM — Cinematic Prompting Framework

> **Origin**: The Creative Cloner AI Agent (R51) by RoboNuggets
> **Purpose**: Standardized prompting language for preserving cinematic structure across AI image and video generation. Ensures consistent visual grammar when recreating or generating scenes.

---

## Framework Definition

**SEALCaM** is an acronym for the six mandatory fields in every generation prompt:

| Token | Field | Description |
|-------|-------|-------------|
| **S** | **Subject** | The primary focus — person, product, object. Include appearance details, clothing, expression, positioning. |
| **E** | **Environment** | The setting — location, background elements, spatial context, time of day, weather. |
| **A** | **Action** | What's happening — movement, gesture, interaction, state change. Use active verbs. |
| **L** | **Lighting** | Light quality, direction, color temperature, shadows, atmosphere. Drives mood. |
| **Ca** | **Camera** | Shot type, angle, movement, lens characteristics. Controls viewer perspective. |
| **M** | **Metatokens** | Style modifiers, quality boosters, aesthetic references. Controls generation engine behavior. |

---

## Field Ordering Rule

**Mandatory**: Fields must appear in **S → E → A → L → Ca → M** order in every prompt. This ensures consistent parsing by generation models and makes prompts auditable.

```
[Subject description]. [Environment description]. [Action description].
[Lighting description]. [Camera description]. [Metatokens].
```

---

## Per-Field Terminology Guidelines

### Subject (S)
- Be specific: "a 30-year-old woman with short auburn hair wearing a navy blazer" not "a person"
- For products: include material, color, size relative to frame
- For multiple subjects: establish spatial relationship ("standing left of", "holding")

### Environment (E)
- Layer depth: foreground elements, midground setting, background context
- Include surface textures and materials when relevant
- Time indicators: "golden hour", "overcast midday", "neon-lit nighttime"

### Action (A)
- Use present continuous: "reaching toward", "pouring into", "turning to face"
- For static shots: describe the held pose, not "standing still"
- Include micro-actions: "slight smile forming", "fingers drumming on table"

### Lighting (L)
- Name the source: "soft window light from camera-left", "overhead fluorescent"
- Describe shadow behavior: "deep contrast shadows", "soft diffused no-shadow"
- Color temperature: "warm 3200K tungsten", "cool 5600K daylight"

### Camera (Ca)
- Shot size: extreme close-up, close-up, medium, medium-wide, wide, extreme wide
- Angle: eye-level, low-angle, high-angle, bird's-eye, worm's-eye, Dutch
- Movement: static, slow pan left, dolly in, tracking shot, handheld shake
- Lens: "35mm wide", "85mm portrait", "macro", "anamorphic"

### Metatokens (M)
- Quality: "8K", "photorealistic", "cinematic color grade", "film grain"
- Style: "editorial fashion photography", "documentary style", "commercial polish"
- Negative guidance (when supported): "no text, no watermark, no blur"

---

## Usage: Image Prompts vs Video Prompts

### Image Prompts (start frames)
Use full SEALCaM with emphasis on **S, E, L, Ca**. Action field describes a frozen moment — the pose at the start of the scene.

```
Example:
S: A sleek black smartwatch on a male wrist, screen showing 10:08.
E: Minimalist white marble desk, single succulent plant in background.
A: Wrist resting flat on desk surface, fingers relaxed.
L: Soft overhead diffused light, subtle shadow beneath wrist.
Ca: Close-up, 60mm macro lens, 15-degree top-down angle, static.
M: Product photography, 8K, commercial polish, no reflections on screen.
```

### Video Prompts (motion clips)
Use full SEALCaM with emphasis on **A, Ca**. Action describes the full motion arc. Camera describes movement over time.

```
Example:
S: A sleek black smartwatch on a male wrist, screen showing 10:08.
E: Minimalist white marble desk transitioning to outdoor café terrace.
A: Wrist lifts from desk, rotates 45 degrees to reveal watch face, then arm extends forward.
L: Transitions from soft indoor diffused to warm golden hour sunlight.
Ca: Starts close-up static, then slow dolly out to medium shot over 5 seconds.
M: Cinematic, smooth motion, 24fps film look, no jitter.
```

---

## Prompt Assembly (Runtime)

When building prompts at runtime, concatenate fields with periods:

```typescript
function buildSEALCaMPrompt(scene: SEALCaMScene): string {
  return [
    scene.subject,
    scene.environment,
    scene.action,
    scene.lighting,
    scene.camera,
    scene.metatokens
  ].join('. ') + '.';
}
```

### TypeScript Interface

```typescript
interface SEALCaMScene {
  subject: string;
  environment: string;
  action: string;
  lighting: string;
  camera_motion: CameraMotion;        // structured camera — see engines/CAMERA_MOTION_ENGINE.md
  metatokens: string;
  scene_transition?: SceneTransition;  // inter-scene transition control
  interpolation?: Interpolation;       // intra-scene start/end frame bridging
}

// Backward compatibility: legacy scenes with camera: string are still supported.
// The buildSEALCaMPrompt() function detects the type and handles both.

// CameraMotion, SceneTransition, and Interpolation types are defined in
// engines/CAMERA_MOTION_ENGINE.md — Module #24
```

### Updated Prompt Builder

```typescript
function buildSEALCaMPrompt(scene: SEALCaMScene, provider?: string): string {
  // Translate structured camera_motion to provider-specific text
  const cameraText = typeof scene.camera_motion === 'string'
    ? scene.camera_motion  // legacy string support
    : translateCameraMotion(scene.camera_motion, provider ?? 'veo3');

  return [
    scene.subject,
    scene.environment,
    scene.action,
    scene.lighting,
    cameraText,
    scene.metatokens
  ].join('. ') + '.';
}

// translateCameraMotion() is provided by Camera Motion Engine (#24)
// See engines/CAMERA_MOTION_ENGINE.md for provider-specific translation logic
```

---

## Family Adoption

| Family | SEALCaM Status | Notes |
|--------|---------------|-------|
| **Creative Cloner (F8)** | **Mandatory** | Core to the pipeline — all prompts must be SEALCaM-structured |
| **Cinematic Ad (F5)** | **Recommended** | ClearCam YAML can map to SEALCaM fields; improves consistency |
| **Ad Creator (F7)** | **Mandatory** | Prompt Schema Normalizer converts legacy stringified JSON to SEALCaM (see below) |
| **UGC Video (F1)** | Optional | Simpler scenes may not benefit from full framework |
| **AI Spokesperson (F2)** | Not applicable | Avatar-driven; camera/lighting controlled by avatar engine |
| **Product Videography (F3)** | Optional | Could enhance start/end frame prompts |
| **Social Content (F4)** | Not applicable | Static images with simpler prompt requirements |
| **Core Elements Board (F6)** | Optional | Compositing prompts could use S + E fields |

---

## F7 Prompt Schema Normalization (formerly standalone module #18)

> **Merged into SEALCaM** — this is the F7-specific normalization rule that converts the Ad Creator's legacy stringified JSON video prompts into SEALCaM-compliant nested objects.

### Problem

F7 Ad Creator originally output `video_prompt` as a stringified JSON string inside the output JSON — requiring double-serialization handling and making prompts fragile.

### Solution: Nested Object → SEALCaM Fields

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

### Updated F7 Output Schema

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
  "creative_summary": "...",
  "aspect_ratio": "9:16",
  "video_model": "veo3_fast"
}
```

### Migration in F7 Pipeline

**Stage 3**: Creative Director Agent system prompt updated to output nested objects instead of stringified JSON.

**Stage 6**: Video generation reads structured fields directly:
```javascript
const { subject, environment, action, lighting, camera, metatokens } = output.video_prompt;
const prompt = buildSEALCaMPrompt(output.video_prompt); // uses shared function above
```

### Key Notes

1. **Backward compatible** — existing jobs with stringified JSON still parse correctly; new jobs use nested objects
2. **SEALCaM alignment** enables template reuse across F5, F7, F8
3. **Music and dialogue removed from video prompt** — handled by separate Music Engine and voice lanes
4. **The `metatokens` field** is the catch-all for style, mood, keywords — keeps the schema clean
