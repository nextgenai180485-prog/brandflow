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
  camera: string;
  metatokens: string;
}
```

---

## Family Adoption

| Family | SEALCaM Status | Notes |
|--------|---------------|-------|
| **Creative Cloner (F8)** | **Mandatory** | Core to the pipeline — all prompts must be SEALCaM-structured |
| **Cinematic Ad (F5)** | **Recommended** | ClearCam YAML can map to SEALCaM fields; improves consistency |
| **Ad Creator (F7)** | **Recommended** | Creative Director agent can output SEALCaM; adds structure to single-scene ads |
| **UGC Video (F1)** | Optional | Simpler scenes may not benefit from full framework |
| **AI Spokesperson (F2)** | Not applicable | Avatar-driven; camera/lighting controlled by avatar engine |
| **Product Videography (F3)** | Optional | Could enhance start/end frame prompts |
| **Social Content (F4)** | Not applicable | Static images with simpler prompt requirements |
| **Core Elements Board (F6)** | Optional | Compositing prompts could use S + E fields |
