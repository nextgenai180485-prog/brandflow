

# Premium Enterprise-Grade Cinematic System — Phased Plan

## Current State

The F5 Cinematic Ad pipeline uses freeform `transition_prompt` text ("SLOW movement") for camera control. SEALCaM has a `Camera` field but it's a text string, not structured. No motion intensity parameter exists. No transition type schema. Creative Direction Engine (#23) is spec-only. Character Consistency works ~85% via text descriptors + end-frame passthrough.

---

## Phase 1 — Camera Motion Vocabulary Engine (New Module #24)

**Create**: `docs/engines/CAMERA_MOTION_ENGINE.md`

Define a structured camera motion vocabulary replacing freeform text:

```text
camera_motion: {
  move_type: STATIC | DOLLY_IN | DOLLY_OUT | PAN_LEFT | PAN_RIGHT |
             TILT_UP | TILT_DOWN | CRANE_UP | CRANE_DOWN |
             TRACKING_LEFT | TRACKING_RIGHT | ORBIT_CW | ORBIT_CCW |
             HANDHELD | ZOOM_IN | ZOOM_OUT | RACK_FOCUS
  intensity: 0.0–1.0        // replaces hardcoded "SLOW"
  speed_curve: LINEAR | EASE_IN | EASE_OUT | EASE_IN_OUT
  start_angle_deg: number   // optional, e.g. 0
  end_angle_deg: number     // optional, e.g. 45
  focus_pull: {              // optional
    from: FOREGROUND | MIDGROUND | BACKGROUND
    to: FOREGROUND | MIDGROUND | BACKGROUND
    at_seconds: number
  }
}
```

**Provider translation layer** — map structured params to provider-specific prompt syntax:
- **Veo3**: Natural language with intensity keywords ("very slow dolly forward")
- **Kling 2.6**: Motion control parameters where API supports them
- **Runway Gen-4**: Camera motion presets + intensity

**Update files**:
- `docs/pipelines/SEALCAM_FRAMEWORK.md` — Replace `camera: string` with structured `camera_motion` object in the `SEALCaMScene` interface
- `docs/pipelines/CINEMATIC_AD_PIPELINE.md` — Replace `transition_prompt` with `camera_motion` + `transition` objects in Scene Schema
- `docs/engines/PROVIDER_ROUTING_POLICY.md` — Add camera capability matrix per provider

---

## Phase 2 — Scene Transition Schema

**Add to**: `docs/engines/CAMERA_MOTION_ENGINE.md` (same module)

```text
scene_transition: {
  type: CUT | DISSOLVE | CROSS_DISSOLVE | MATCH_CUT |
        WHIP_PAN | FADE_TO_BLACK | FADE_FROM_BLACK |
        WIPE | MORPH | JUMP_CUT
  duration_ms: number          // 0 for CUT, 500-2000 for dissolves
  direction: LEFT | RIGHT | UP | DOWN   // for WIPE/WHIP_PAN only
}
```

**Interpolation control** (start/end frame bridging):
```text
interpolation: {
  style: LINEAR | SMOOTH | DRAMATIC | DREAMY
  mid_keyframe_hint: string    // optional text hint for mid-scene
  easing: EASE_IN | EASE_OUT | EASE_IN_OUT | LINEAR
}
```

**Update**: F5 scene output schema replaces `transition_prompt: string` with:
```text
{
  camera_motion: { ... },
  scene_transition: { ... },
  interpolation: { ... }
}
```

---

## Phase 3 — Creative Direction Engine (#23) Full Spec

**Create**: `docs/engines/CREATIVE_DIRECTION_ENGINE.md`

This is the commercial moat. All video families (F1-F5) pass through this before any generation.

**Intake schema** (business inputs):
- brand, product/service, offer, audience, platform(s), duration, tone, compliance constraints, reference assets, visual style

**Reasoning outputs**:
- `ad_angle`: The strategic positioning (e.g., "transformation story", "social proof", "urgency")
- `hook_logic`: Selected from Hook Library (#11) with data-driven ranking, includes opening 3s strategy
- `scene_architecture[]`: Ordered scenes with purpose (hook, build, offer, CTA), timing, and camera_motion presets
- `offer_emphasis`: Where and how the offer appears (overlay timing, verbal mention, visual callout)
- `emotional_arc`: Tension curve mapped to scenes (intrigue → desire → urgency → action)

**Per-family adaptations**:
| Family | Adaptation |
|--------|-----------|
| F1 UGC | Authenticity bias, single-character, testimonial angles |
| F2 Spokesperson | Script-first, talking-head framing, authority angles |
| F3 Product | Product hero shots, feature demonstration arcs |
| F5 Cinematic | Multi-scene narrative, dramatic camera, brand storytelling |

**Update files**:
- `docs/ENGINE_MODULE_REGISTRY.md` — Add Module #23 and #24
- `docs/PIPELINE_CONTRACTS.md` — Add Stage 1 Creative Direction as mandatory first step for F1-F5
- All family pipeline docs (F1-F5) — Reference #23 as first stage

---

## Phase 4 — Character Consistency Hardening

**Update**: `docs/engines/CHARACTER_CONSISTENCY_ENGINE.md`

Close the ~85% → ~95% gap:

- **Structured appearance locking**: Convert canonical descriptors to per-provider optimized constraint prompts (not just text injection)
- **Scene-chain validation**: After each scene generates, run a consistency scoring pass. If score < threshold (0.85), auto-regenerate with strengthened descriptors
- **End-frame quality gate**: Validate end-frame matches canonical descriptor before passing to next scene
- **Provider-specific identity hints**: Map character descriptors to provider-native features when available (e.g., Kling character reference, Veo3 identity tokens)

---

## Phase 5 — Integration + Pipeline Contract Updates

Stitch everything together across the system:

1. **Update `docs/PIPELINE_CONTRACTS.md`**:
   - New Job Stage Flow: `creative_direction → asset_analysis → planning → plan_review → [revision_loop] → generation → assembly → post_production → [localization] → delivery`
   - Add Module #23 and #24 to all video family engine module lists

2. **Update `docs/pipelines/CINEMATIC_AD_PIPELINE.md`**:
   - Replace Stage 3 Scene Planning output schema with structured camera_motion + scene_transition objects
   - Add Creative Direction as new Stage 1 (shift existing stages)
   - Update Stage 5 video generation to pass structured camera params through provider translation layer

3. **Update all video family pipeline docs** (F1, F2, F3, F5, F7, F8):
   - Reference Module #23 Creative Direction as mandatory first stage
   - Reference Module #24 Camera Motion where applicable (F3, F5, F7, F8)

4. **Update `docs/pipelines/SEALCAM_FRAMEWORK.md`**:
   - Replace `camera: string` in TypeScript interface with structured `CameraMotion` type
   - Add `SceneTransition` and `Interpolation` types
   - Update `buildSEALCaMPrompt()` to translate structured camera to provider-specific text

5. **Update `docs/ENGINE_MODULE_REGISTRY.md`**:
   - Add Module #23 Creative Direction Engine
   - Add Module #24 Camera Motion & Transition Engine
   - Update module count to 24

---

## Files Changed Summary

| File | Action |
|------|--------|
| `docs/engines/CAMERA_MOTION_ENGINE.md` | **Create** — Camera vocabulary, transition schema, provider translation |
| `docs/engines/CREATIVE_DIRECTION_ENGINE.md` | **Create** — Full intake/reasoning/output spec |
| `docs/ENGINE_MODULE_REGISTRY.md` | **Update** — Add modules #23, #24 |
| `docs/PIPELINE_CONTRACTS.md` | **Update** — New stage flow, new modules in family lists |
| `docs/pipelines/CINEMATIC_AD_PIPELINE.md` | **Update** — Structured camera/transition in scene schema |
| `docs/pipelines/SEALCAM_FRAMEWORK.md` | **Update** — Structured types replace string camera field |
| `docs/engines/CHARACTER_CONSISTENCY_ENGINE.md` | **Update** — Hardening: validation gates, provider-specific hints |
| `docs/engines/PROVIDER_ROUTING_POLICY.md` | **Update** — Camera capability matrix |
| `docs/pipelines/UGC_VIDEO_PIPELINE.md` | **Update** — Reference #23 |
| `docs/pipelines/AI_SPOKESPERSON_PIPELINE.md` | **Update** — Reference #23 |
| `docs/pipelines/PRODUCT_VIDEOGRAPHY_PIPELINE.md` | **Update** — Reference #23, #24 |
| `docs/pipelines/AD_CREATOR_PIPELINE.md` | **Update** — Reference #23, #24 |
| `docs/pipelines/CREATIVE_CLONER_PIPELINE.md` | **Update** — Reference #23, #24 |

