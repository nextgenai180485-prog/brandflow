# Character Consistency Engine — Technical Reference

> **Status**: Design reference — not yet implemented  
> **Owner**: Cross-family shared module  
> **Purpose**: Maintain visual character identity across multi-scene pipelines

---

## Overview

Multi-scene pipelines (F1 UGC, F5 Cinematic Ad, F8 Creative Cloner) suffer from character drift — the same character looks different across scenes because each scene prompt is generated independently. This engine enforces consistency through canonical descriptors, end-frame passthroughs, and identity embeddings.

---

## Architecture

```text
Scene 1 Generation
  ├─ Inject canonical character descriptor into prompt
  ├─ Generate start/end frames
  └─ Store end-frame as next_scene_reference
        │
        ▼
Scene 2 Generation
  ├─ Inject canonical character descriptor into prompt
  ├─ Pass Scene 1 end-frame as visual reference
  ├─ Generate start/end frames
  └─ Store end-frame as next_scene_reference
        │
        ▼
Scene N...
```

---

## Character Consistency Context Schema

```json
{
  "character_id": "uuid",
  "initiative_id": "uuid",
  "canonical_descriptor": {
    "appearance": "Mid-30s woman, medium brown skin, high cheekbones, warm brown eyes",
    "hair": "Black curly hair, shoulder-length, natural texture",
    "outfit": "White linen blazer over sage green top, gold hoop earrings",
    "expression": "Confident, approachable, slight smile",
    "distinguishing_features": "Small beauty mark on left cheek, defined eyebrows",
    "body_type": "Athletic build, 5'7\" estimated"
  },
  "character_seed_reference": "https://storage.../character_ref_001.png",
  "character_identity_embedding": null,
  "scene_references": [
    {
      "scene_number": 1,
      "end_frame_url": "https://storage.../scene1_end.png",
      "consistency_score": 0.92
    }
  ]
}
```

---

## Implementation Components

### 1. Canonical Descriptor Block

Extracted during Stage 2 (Asset Analysis) using the unified `AnalyzeAsset` Edge Function (mode: `character`). The descriptor is a structured text block injected into EVERY scene prompt:

```
## Character Consistency — MANDATORY
Maintain EXACT visual identity across all scenes:
- Appearance: {{canonical_descriptor.appearance}}
- Hair: {{canonical_descriptor.hair}}
- Outfit: {{canonical_descriptor.outfit}}
- Expression: {{canonical_descriptor.expression}}
- Distinguishing features: {{canonical_descriptor.distinguishing_features}}

DO NOT alter, age, or change the character's appearance between scenes.
The character must be immediately recognizable as the same person in every frame.
```

### 2. End-Frame Passthrough

For multi-scene families, the end frame of Scene N is passed as a visual reference input to Scene N+1:

| Family | Image Model | How Reference is Passed |
|--------|-------------|------------------------|
| F1 UGC | Kie AI / Fal AI | `imageUrls` parameter includes previous end-frame |
| F5 Cinematic Ad | WaveSpeed nano-banana-pro | `images[]` array includes previous end-frame |
| F8 Creative Cloner | WaveSpeed nano-banana-pro | `images[]` array includes previous end-frame |

### 3. Character Seed Reference

The original character photo (uploaded by user or generated) is stored as `character_seed_reference` and persisted per initiative. This serves as the ground-truth reference that all scene generations compare against.

### 4. Character Identity Embedding (Future)

When available from providers, store a vector embedding of the character's face. This enables:
- Cross-session consistency (same character across different generation jobs)
- Character library (reusable characters across campaigns)
- Consistency scoring (compare generated character against reference embedding)

---

## Cross-Family Integration

| Family | Integration Pattern |
|--------|-------------------|
| **F1 UGC** | Inject descriptor into each scene prompt; pass end-frame between clips in Variant B |
| **F5 Cinematic Ad** | Inject descriptor into all 5 scene prompts; end-frame passthrough between scenes |
| **F8 Creative Cloner** | Extract descriptor from template analysis; inject into recreation prompts |
| **F2 AI Spokesperson** | Not needed — single-scene, single-face pipeline |
| **F3 Product Videography** | Product consistency (not character) — handled by product reference image |

---

## Consistency Scoring

After each scene is generated, optionally run a consistency check:

1. Extract face region from generated frame
2. Compare against `character_seed_reference` using vision model
3. Score: 0.0 (completely different) to 1.0 (identical)
4. If score < 0.7: flag for regeneration or user review
5. Store score in `scene_references[].consistency_score`

---

## Key Design Notes

1. **Text descriptor is the primary consistency mechanism** — image-to-image reference is supplementary
2. **End-frame passthrough is critical** for maintaining outfit, lighting, and pose continuity
3. **Character identity embedding is future-proofing** — not required for MVP
4. **Works with AI-generated characters too** — the canonical descriptor is extracted from the first generated frame if no real photo is provided
5. **Outfit consistency is the hardest problem** — explicitly include outfit details in every prompt
