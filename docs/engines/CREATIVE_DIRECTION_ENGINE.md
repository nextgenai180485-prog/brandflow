# Creative Direction Engine — Technical Reference (Module #23)

> **Status**: Design reference — not yet implemented  
> **Owner**: Cross-family mandatory module  
> **Purpose**: Transform business inputs into commercially viable creative briefs before any generation occurs  
> **Commercial significance**: This is Brandflow's primary moat — strategic creative reasoning that separates it from generic AI video tools

---

## Overview

Every video generation family (F1–F5, F7, F8) must pass through the Creative Direction Engine as **Stage 1** before any media generation begins. This module:

1. Takes structured business inputs (brand, offer, audience, platform)
2. Performs strategic reasoning to determine the optimal ad approach
3. Outputs a complete creative brief: ad angle, hook logic, scene architecture, offer emphasis
4. Feeds directly into the Plan Review Gate (#2) for user approval

Without this module, video engines simply rewrite prompts. With it, they produce commercially-sound advertisements grounded in strategic thinking.

---

## Intake Schema

```typescript
interface CreativeDirectionIntake {
  // Brand context
  brand_id: string;
  brand_name: string;
  brand_voice_profile?: BrandVoiceDNA;     // from Module #12, if available
  
  // Product/Service
  product_name: string;
  product_description: string;
  product_category: string;                 // e.g., "skincare", "SaaS", "restaurant"
  product_images: string[];                 // reference image URLs
  
  // Offer
  offer?: string;                           // e.g., "20% off first order", "Free trial"
  offer_urgency?: 'none' | 'low' | 'medium' | 'high';
  
  // Audience
  target_audience: string;                  // e.g., "Women 25-40, health-conscious"
  audience_pain_points?: string[];          // e.g., ["dry skin in winter", "expensive treatments"]
  
  // Desired outcome
  objective: 'awareness' | 'consideration' | 'conversion' | 'retention';
  desired_action: string;                   // e.g., "Visit website", "Use discount code"
  
  // Platform & Format
  platforms: Platform[];                    // e.g., ["tiktok", "instagram_reels"]
  aspect_ratio: '9:16' | '16:9' | '1:1' | '4:5';
  duration_target: 5 | 15 | 30;            // seconds
  
  // Creative preferences
  visual_style?: string;                    // e.g., "moody noir", "bright and clean"
  tone?: string;                            // e.g., "playful", "authoritative", "urgent"
  reference_assets?: string[];              // inspiration URLs
  
  // Constraints
  compliance_constraints?: string[];        // e.g., ["no alcohol imagery", "FDA disclaimer required"]
  
  // Generation family
  family: 'F1' | 'F2' | 'F3' | 'F5' | 'F7' | 'F8';
  
  // Core Elements Board
  core_elements_board_url?: string;         // from F6, if available
}

type Platform = 'tiktok' | 'instagram_reels' | 'instagram_feed' | 'youtube_shorts' | 
                'youtube' | 'facebook' | 'linkedin' | 'twitter' | 'pinterest';
```

---

## Reasoning Framework (AGENT)

The Creative Direction Engine uses an extended AGENT framework with a mandatory **Think Tool** pass before output generation.

### System Prompt Structure

```
## 🎬 SYSTEM PROMPT: Creative Direction Engine

A – Ask:
  Transform business inputs into a commercially viable creative brief.
  You must produce: ad angle, hook logic, scene architecture, offer emphasis, and emotional arc.
  Your output will be reviewed by a human before any media generation occurs.

G – Guidance:
  role: Senior Creative Director at a performance marketing agency
  mindset: Every creative decision must serve a commercial objective
  
  ## Reasoning Steps (MANDATORY — execute in order):
  
  1. AUDIENCE ANALYSIS
     - Who is watching? What do they care about?
     - What stops their scroll? What makes them act?
     - Map pain points to product benefits
  
  2. ANGLE SELECTION
     - Choose the strategic positioning for this ad
     - Consider: transformation, social proof, urgency, curiosity, authority, fear of missing out
     - Filter angles against brand voice (if available)
  
  3. HOOK STRATEGY
     - Select opening 3-second strategy from Hook Library results
     - Hook must match: platform norms + audience psychology + ad angle
     - Score confidence: how likely is this hook to stop scrolling?
  
  4. SCENE ARCHITECTURE
     - Build scene-by-scene plan with purpose assignments
     - Every scene must serve one of: HOOK, BUILD, OFFER, CTA
     - Assign camera motion presets from Camera Motion Engine (#24)
     - Ensure total duration ±2s of target
  
  5. OFFER EMPHASIS
     - Decide WHERE and HOW the offer appears
     - Options: verbal mention, text overlay, product close-up, end card
     - Timing: when in the video flow does the offer land hardest?
  
  6. EMOTIONAL ARC
     - Map tension curve to scenes
     - Pattern: intrigue → desire → urgency → action
     - Each scene should escalate emotional intensity

E – Examples:
  [Populated dynamically from Hook Library + historical performance data]

N – Notation:
  Output must be valid JSON matching CreativeDirectionOutput schema.

T – Tools:
  - Think Tool: Mandatory reasoning before output
  - Hook Library (#11): Query for performance-ranked hooks
  - Brand Voice DNA (#12): Load brand constraints
  - Performance Feedback (#22): Historical angle/hook performance
```

---

## Output Schema

```typescript
interface CreativeDirectionOutput {
  // Strategic positioning
  ad_angle: {
    type: AdAngleType;
    description: string;              // 1-2 sentence explanation
    confidence: number;               // 0.0-1.0 based on historical performance
    reasoning: string;                // why this angle was chosen
  };
  
  // Hook strategy
  hook_logic: {
    style: HookStyle;
    opening_line: string;             // the actual first 3 seconds
    hook_pattern_id?: string;         // FK → hooks table, if from Hook Library
    confidence: number;               // 0.0-1.0
    platform_fit: number;             // 0.0-1.0 match to target platform norms
  };
  
  // Scene plan
  scene_architecture: SceneBlock[];
  
  // Offer placement
  offer_emphasis: {
    placement: OfferPlacement[];
    primary_cta: string;              // e.g., "Shop now — link in bio"
    cta_timing_s: number;             // when CTA appears (seconds from start)
  };
  
  // Emotional journey
  emotional_arc: {
    scenes: { scene_id: number; emotion: string; intensity: number }[];
    peak_moment_s: number;            // timestamp of highest emotional intensity
  };
  
  // Concept identity
  concept_family: string;             // e.g., "transformation_story", "before_after"
  visual_direction: string;           // e.g., "warm tones, natural light, intimate framing"
  
  // Metadata
  estimated_duration_s: number;
  estimated_cost_usd: number;
  platform_optimizations: Record<Platform, string>;  // per-platform notes
}

interface SceneBlock {
  scene_id: number;
  purpose: 'HOOK' | 'BUILD' | 'OFFER' | 'CTA' | 'TRANSITION';
  duration_s: number;
  description: string;                // what happens in this scene
  subject_action: string;             // specific action/pose
  camera_motion: CameraMotion;        // from Module #24
  scene_transition: SceneTransition;  // from Module #24
  interpolation?: Interpolation;      // from Module #24
  offer_beat?: string;                // if offer appears in this scene
  dialogue?: string;                  // if spoken content in this scene
}

type AdAngleType = 
  | 'transformation'       // Before/after, life improvement
  | 'social_proof'         // Testimonial, reviews, crowd validation
  | 'urgency'              // Limited time, scarcity
  | 'curiosity'            // Mystery, unexpected reveal
  | 'authority'            // Expert endorsement, credentials
  | 'fomo'                 // Fear of missing out
  | 'problem_solution'     // Pain point → product fix
  | 'lifestyle'            // Aspirational identity
  | 'comparison'           // Us vs. them / old way vs. new way
  | 'storytelling'         // Narrative arc, character journey
  | 'educational'          // How-to, tips, value-first
  | 'shock_value';         // Pattern interrupt, unexpected

type HookStyle =
  | 'question'             // "Did you know...?"
  | 'bold_claim'           // "This changed everything"
  | 'stop_scroll'          // "Stop scrolling if you..."
  | 'controversy'          // "Unpopular opinion:"
  | 'relatability'         // "POV: you just..."
  | 'visual_hook'          // No text — visual pattern interrupt
  | 'stat_lead'            // "97% of people don't know..."
  | 'story_open'           // "Last week I..."
  | 'direct_address';      // "Hey [audience], listen up"

type OfferPlacement = 
  | 'verbal_mention'       // Spoken in dialogue/VO
  | 'text_overlay'         // On-screen text
  | 'product_closeup'      // Visual emphasis on product
  | 'end_card'             // Final frame CTA
  | 'lower_third';         // Persistent lower-third banner
```

---

## Per-Family Adaptations

### F1 — UGC Video

```typescript
const F1_DEFAULTS: Partial<CreativeDirectionOutput> = {
  ad_angle: { type: 'relatability' },     // UGC = authentic, relatable
  hook_logic: { style: 'relatability' },   // "POV: you just..."
  visual_direction: 'amateur iPhone quality, casual lighting, authentic settings',
  scene_architecture: [
    // Single scene for Variant A, 1-3 scenes for Variant B
    { purpose: 'HOOK', camera_motion: { move_type: 'HANDHELD', intensity: 0.3 } }
  ]
};

// F1-specific constraints:
// - Max 3 scenes (Variant B)
// - Must feel unpolished — no cinematic camera moves
// - Dialogue must be casual, conversational
// - Product placement must feel organic, not staged
```

### F2 — AI Spokesperson

```typescript
const F2_DEFAULTS: Partial<CreativeDirectionOutput> = {
  ad_angle: { type: 'authority' },         // Spokesperson = credibility
  hook_logic: { style: 'direct_address' }, // "Hey [audience], listen up"
  visual_direction: 'clean background, good lighting, talking head framing',
  scene_architecture: [
    // Script-first: entire video is one continuous take
    { purpose: 'HOOK', duration_s: 3 },
    { purpose: 'BUILD', duration_s: 15 },
    { purpose: 'OFFER', duration_s: 7 },
    { purpose: 'CTA', duration_s: 5 }
  ]
};

// F2-specific constraints:
// - Script must be speakable (natural cadence, pauses)
// - No complex camera moves (lip-sync driven)
// - Hook must work in first 3 seconds of talking
// - CTA must be clear verbal call-to-action
```

### F3 — Product Videography

```typescript
const F3_DEFAULTS: Partial<CreativeDirectionOutput> = {
  ad_angle: { type: 'lifestyle' },         // Product as aspirational object
  hook_logic: { style: 'visual_hook' },    // No text — visual beauty
  visual_direction: 'premium macro, studio lighting, material fidelity',
  scene_architecture: [
    // Single scene: start frame → end frame → transition
    { purpose: 'HOOK', camera_motion: { move_type: 'DOLLY_IN', intensity: 0.2, speed_curve: 'EASE_IN_OUT' } }
  ]
};

// F3-specific constraints:
// - Product must remain static — camera moves, product doesn't
// - Hero shot emphasis: product fills 60%+ of frame
// - Feature-benefit mapping: each angle showcases a product attribute
// - Detail close-ups for texture, material quality
```

### F5 — Cinematic Ad

```typescript
const F5_DEFAULTS: Partial<CreativeDirectionOutput> = {
  ad_angle: { type: 'storytelling' },      // Narrative arc
  hook_logic: { style: 'visual_hook' },    // Cinematic visual opening
  visual_direction: 'cinematic color grade, dramatic lighting, premium composition',
  scene_architecture: [
    // 3-8 scenes with full emotional arc
    { purpose: 'HOOK', duration_s: 5, camera_motion: { move_type: 'DOLLY_IN', intensity: 0.5 } },
    { purpose: 'BUILD', duration_s: 10, camera_motion: { move_type: 'TRACKING_RIGHT', intensity: 0.4 } },
    { purpose: 'BUILD', duration_s: 5, camera_motion: { move_type: 'CRANE_UP', intensity: 0.6 } },
    { purpose: 'OFFER', duration_s: 5, camera_motion: { move_type: 'DOLLY_IN', intensity: 0.3 } },
    { purpose: 'CTA', duration_s: 5, camera_motion: { move_type: 'STATIC', intensity: 0.0 } }
  ]
};

// F5-specific constraints:
// - Narrative arc: tension → resolution
// - Music mood must align with emotional arc
// - Premium visual direction: no amateur aesthetics
// - Scene transitions are critical — use DISSOLVE, MATCH_CUT, FADE_TO_BLACK
// - Duration budget: scenes must sum to target ±2s
```

### F7 — Ad Creator

Inherits F3 defaults with enhanced creative summary output. Single-scene pipeline.

### F8 — Creative Cloner

Special case: Creative Direction Engine receives the **source video's SEALCaM analysis** as additional input and must produce a creative brief that preserves the original's cinematic structure while substituting new subjects/products.

---

## Hook Library Integration (#11)

Before generating the creative brief, the engine queries the Hook Library:

```sql
SELECT hook_id, hook_text, hook_style, platform, industry,
       performance_score, usage_count
FROM hooks
WHERE industry = :product_category
  AND platform = ANY(:platforms)
ORDER BY performance_score DESC
LIMIT 10;
```

The top hooks are injected into the AGENT system prompt as examples. The engine selects the best fit based on:
- **Platform match**: TikTok hooks differ from LinkedIn hooks
- **Industry relevance**: Skincare hooks ≠ SaaS hooks
- **Ad angle compatibility**: "Urgency" angles need urgency-style hooks
- **Brand voice filter**: Hooks that conflict with brand tone are deprioritized

---

## Brand Voice DNA Integration (#12)

If the brand has a voice profile, it's injected as a constraint block:

```
## Brand Voice Context — MANDATORY CONSTRAINTS
Tone: {{brand_voice.tone}}
Vocabulary: Use these terms: {{brand_voice.preferred_terms}}
Avoid: {{brand_voice.avoided_terms}}
CTA patterns: {{brand_voice.cta_patterns}}
Messaging pillars: {{brand_voice.pillars}}

All creative output must be consistent with this voice profile.
```

### Angle Filtering

Ad angles that conflict with the brand voice are deprioritized:
- Conservative brand → deprioritize `shock_value`, `controversy`
- Luxury brand → deprioritize `urgency`, `fomo`
- Professional brand → deprioritize `relatability` (informal UGC style)

---

## Performance Feedback Integration (#22)

Historical performance data informs creative decisions:

```typescript
interface PerformanceContext {
  // Which ad angles converted best for this brand?
  top_angles: { angle: AdAngleType; conversion_rate: number }[];
  
  // Which hooks stopped scrolling?
  top_hooks: { hook_id: string; ctr: number; retention_3s: number }[];
  
  // Which scene patterns engaged viewers?
  top_scene_patterns: { pattern: string; completion_rate: number }[];
  
  // Brand-specific learning
  brand_preferences: { preferred_angles: AdAngleType[]; avoided_angles: AdAngleType[] };
}
```

This data feeds into the reasoning step, biasing the engine toward proven patterns while still allowing creative exploration.

---

## Plan Review Gate Handoff (#2)

The Creative Direction output is formatted for user review:

```
📢 AD ANGLE: {{ad_angle.type}} — {{ad_angle.description}}

🎣 HOOK: "{{hook_logic.opening_line}}"
   Style: {{hook_logic.style}} | Confidence: {{hook_logic.confidence}}

🎬 SCENE PLAN:
{{#each scene_architecture}}
  Scene {{scene_id}} [{{purpose}}] — {{duration_s}}s
  {{description}}
  Camera: {{camera_motion.move_type}} @ {{camera_motion.intensity}} intensity
  Transition: {{scene_transition.type}}
{{/each}}

🎯 OFFER: {{offer_emphasis.primary_cta}}
   Appears at: {{offer_emphasis.cta_timing_s}}s
   Placement: {{offer_emphasis.placement}}

⏱️ Total duration: {{estimated_duration_s}}s
💰 Estimated cost: ${{estimated_cost_usd}}

🎭 Emotional arc: {{emotional_arc.scenes[0].emotion}} → {{emotional_arc.peak}} → action
```

**User actions**: Approve / Edit angle / Regenerate direction / Reject

On edit: Re-run the Creative Direction Engine with user feedback as an additional constraint.

---

## Execution Model

```
Intake
  │
  ▼
Query Hook Library (#11) + Brand Voice (#12) + Performance Data (#22)
  │
  ▼
AGENT Reasoning (Think Tool — mandatory)
  ├─ Audience analysis
  ├─ Angle selection (filtered by brand voice)
  ├─ Hook strategy (ranked by performance data)
  ├─ Scene architecture (with camera presets from #24)
  ├─ Offer placement
  └─ Emotional arc mapping
  │
  ▼
Output: CreativeDirectionOutput
  │
  ▼
Plan Review Gate (#2) — User approval
  │
  ├─ Approved → Proceed to SEALCaM → Generation
  ├─ Edit → Re-run with constraints
  └─ Reject → User provides new direction
```

---

## Cross-Family Adoption

| Family | Stage 1 | Required? | Notes |
|--------|---------|-----------|-------|
| **F1 UGC** | ✅ | Mandatory | Authenticity-biased angle selection |
| **F2 Spokesperson** | ✅ | Mandatory | Script-first, talking-point generation |
| **F3 Product** | ✅ | Mandatory | Product hero emphasis, feature mapping |
| **F5 Cinematic Ad** | ✅ | Mandatory | Full emotional arc, multi-scene architecture |
| **F7 Ad Creator** | ✅ | Mandatory | Single-scene creative reasoning |
| **F8 Creative Cloner** | ✅ | Mandatory | Source-preserving with brand adaptation |
| **F4 Social Content** | ✅ | Mandatory | Text-focused creative reasoning |
| **F6 Core Elements** | — | N/A | Image compositing, no creative direction needed |

---

## Key Design Notes

1. **This is the commercial moat** — Without creative direction, Brandflow is a commodity wrapper around video APIs. With it, every output is strategically positioned.
2. **Think Tool is mandatory** — The AI must show its reasoning. This reasoning is logged and can be surfaced to enterprise users.
3. **Performance feedback creates a flywheel** — The more videos generated, the better the creative direction becomes for each brand.
4. **Family adaptations are defaults, not constraints** — The engine can override family defaults if the business context demands it.
5. **Cost estimation happens here** — The scene architecture determines how many provider calls are needed, enabling accurate cost forecasting before generation.
6. **Duration budget is strict** — Scene durations must sum to `duration_target ± 2s`. The engine adjusts scene count and individual durations to hit the target.
