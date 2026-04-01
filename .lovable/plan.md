# Stage 1 — Creative Direction Module: End-to-End Phased Plan

## What This Solves

Currently, video engines rewrite prompts but don't perform **strategic creative reasoning**. This plan adds a mandatory Creative Direction layer that transforms business inputs into commercially viable creative briefs — the primary moat separating Brandflow from generic AI video tools.

---

## Phase 1 — Define the Universal Creative Direction Contract

**Goal**: Single spec document defining inputs, outputs, and reasoning steps.

| Step | Detail |
|------|--------|
| Define intake schema | brand, product/service, offer, audience, desired outcome, platform(s), visual style, reference assets, aspect ratio, duration target |
| Define output schema | `ad_angle`, `hook_logic` (linked to Hook Library #11), `scene_architecture[]`, `offer_emphasis`, `concept_family`, `visual_direction` |
| Define reasoning steps | The AI "Think" pass that bridges intake → output (AGENT framework) |
| Wire to Plan Object | Output feeds directly into `plan_object.creative_brief` field |

**Deliverable**: `docs/engines/CREATIVE_DIRECTION_ENGINE.md`

---

## Phase 2 — Hook Library Integration

**Goal**: Hook selection is data-driven, not random.

| Step | Detail |
|------|--------|
| Connect Hook Library (#11) | Stage 1 queries hook patterns by `industry + platform + objective` |
| Score-weighted selection | Performance Feedback Engine (#22) weights inform hook ranking |
| Output | `hook_logic: { style, opening_line, hook_pattern_id, confidence }` |

**Deliverable**: Update `docs/engines/HOOK_LIBRARY_ENGINE_DESIGN.md` with Stage 1 integration contract.

---

## Phase 3 — Scene Architecture Generator

**Goal**: Every video gets a structured scene plan before any prompt is written.

| Step | Detail |
|------|--------|
| Scene count rules | F1 UGC: 1–3 scenes, F2 Spokesperson: 3–6, F3 Product: 2–4, F5 Cinematic: 3–8 |
| Per-scene output | `{ scene_id, purpose, duration_s, camera_suggestion, subject_action, offer_beat }` |
| SEALCaM handoff | Scene architecture feeds into SEALCaM (#5) for structured prompt generation |
| Duration budget | Total scene durations must sum to duration target (±2s) |

**Deliverable**: Scene architecture schema added to Creative Direction Engine spec.

---

## Phase 4 — Per-Family Adaptation Layer

**Goal**: Each family gets family-specific creative logic on top of the universal module.

| Family | Adaptation |
|--------|-----------|
| **F1 — UGC** | Authenticity emphasis, POV camera bias, casual hook style |
| **F2 — Spokesperson** | Script-first flow, talking points per scene, CTA placement logic |
| **F3 — Product** | Hero shot emphasis, feature-benefit scene mapping, detail close-ups |
| **F5 — Cinematic** | Narrative arc (tension → resolution), music mood alignment, premium visual direction |

**Deliverable**: Family adaptation configs in each pipeline doc.

---

## Phase 5 — Brand Voice DNA Integration

**Goal**: Creative direction is brand-consistent from the start.

| Step | Detail |
|------|--------|
| Pull brand voice profile | Brand Voice DNA (#12) injects tone, vocabulary, and messaging constraints |
| Ad angle filtering | Angles that conflict with brand voice are deprioritized |
| Hook tone matching | Hook Library results filtered by brand voice compatibility score |

**Deliverable**: Update `docs/engines/BRAND_VOICE_DNA_ENGINE.md` with Stage 1 consumption contract.

---

## Phase 6 — Plan Review Gate Integration

**Goal**: User sees and approves the creative direction before any generation starts.

| Step | Detail |
|------|--------|
| Review surface | Show: ad angle, hook, scene breakdown, duration, estimated cost |
| User actions | Approve / Edit angle / Regenerate direction / Reject |
| Revision loop | If edited, re-run Stage 1 with user feedback as constraint |
| Gate pass | Only after approval does the job proceed to SEALCaM → generation |

**Deliverable**: Update Plan Review Gate contract in `docs/PIPELINE_CONTRACTS.md`.

---

## Phase 7 — Performance Feedback Loop

**Goal**: Creative direction improves over time.

| Step | Detail |
|------|--------|
| Track which angles convert | Link `ad_angle` to post-publish performance data |
| Feed back to Hook Library | Winning hooks get weight bumps |
| Feed back to Scene Architecture | Winning scene patterns get priority |
| Per-brand learning | Brand-specific angle preferences accumulate |

**Deliverable**: Update `docs/engines/PERFORMANCE_FEEDBACK_ENGINE.md` with creative direction signals.

---

## Execution Order

```
Phase 1 (Contract)  ←  Must be first — everything depends on it
  ↓
Phase 2 (Hooks) + Phase 3 (Scenes)  ←  Can run in parallel
  ↓
Phase 4 (Family Adaptations)  ←  Depends on Phase 1+3
  ↓
Phase 5 (Brand Voice)  ←  Enhancement layer
  ↓
Phase 6 (Review Gate)  ←  User-facing approval
  ↓
Phase 7 (Feedback Loop)  ←  Post-launch optimization
```

## Files Created/Updated

| File | Action |
|------|--------|
| `docs/engines/CREATIVE_DIRECTION_ENGINE.md` | **New** — full module spec |
| `docs/engines/HOOK_LIBRARY_ENGINE_DESIGN.md` | Update — Stage 1 integration |
| `docs/PIPELINE_CONTRACTS.md` | Update — add Stage 1 as mandatory first step for F1–F5 |
| `docs/engines/BRAND_VOICE_DNA_ENGINE.md` | Update — consumption contract |
| `docs/engines/PERFORMANCE_FEEDBACK_ENGINE.md` | Update — creative direction signals |
| `docs/ENGINE_MODULE_REGISTRY.md` | Update — register Creative Direction as the entry point |
| Per-family pipeline docs (F1–F5) | Update — require Stage 1 before generation |
