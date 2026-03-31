

# Engine Overlap Audit + Lean Touchpoint Tracking Strategy

## Part 1: Overlap & Duplication Analysis

After reviewing all 22 engine specs, here are the areas where responsibilities bleed across module boundaries.

---

### OVERLAP 1: Voice Logic — Modules #16, #15, #20

**Problem**: Three modules handle voice.

| Module | What it does |
|--------|-------------|
| #20 Voice Management Engine | TTS, cloning, presets, dubbing, quality scoring, persona matching |
| #16 UGC Voiceover Extension | Script auto-gen, persona selection, ElevenLabs TTS for F1 |
| #15 Motion Variant Selector | TTS call for F2 spokesperson audio |

**#20 already states** that #16 and #15 become "consumers" — but the specs still contain their own ElevenLabs routing, voice persona tables, and quality logic independently.

**Recommendation**: Consolidate. #16 becomes a thin **F1 workflow adapter** — it generates the voiceover script (its unique value) but delegates ALL voice generation to #20. #15 similarly calls #20 for TTS. Remove all provider-specific voice logic from #15 and #16. This eliminates 2 duplicate provider routing paths and 2 duplicate voice quality pipelines.

---

### OVERLAP 2: Audio Polish — Modules #17, #20

**Problem**: Both modules define audio normalization.

- #17 (Post-Production): "Audio Polish — loudness normalization to -14 LUFS, ducking, noise reduction"
- #20 (Voice Engine): "Quality Pipeline — loudness normalization to -16 LUFS, noise gate, EQ polish, compression"

Two different LUFS targets, two different pipeline definitions for the same operation.

**Recommendation**: #20 owns audio normalization for **voice tracks** (pre-assembly). #17 owns audio normalization for the **final mix** (post-assembly). Document the boundary explicitly: #20 normalizes individual voice stems to -16 LUFS, #17 normalizes the final mixed output to -14 LUFS (broadcast standard). No overlap — just clarify ownership.

---

### OVERLAP 3: Dubbing — Modules #17, #18, #20

**Problem**: Three modules reference dubbing.

- #17 (Post-Production): "Dubbed Language Versions — ElevenLabs Dubbing API"
- #18 (Localization): "Voice Dubbing Coordination — selects target languages, provides pronunciation guides"
- #20 (Voice Engine): "Dubbing operation — generates dubbed audio"

**Recommendation**: Clear ownership chain. #18 is the **requester** (decides what languages, cultural tone). #20 is the **executor** (calls ElevenLabs). #17 is the **integrator** (mixes dubbed audio into final video). Remove the provider-specific ElevenLabs references from #17 and #18 — they should only reference #20.

---

### OVERLAP 4: Subtitle Generation — Modules #17, #18

**Problem**: Both handle subtitles.

- #17: "Auto-Subtitles — BytePlus VOD Smart Captioning, generates SRT/VTT"
- #18: "Subtitle Translation & Timing — translates SRT, adjusts timing for text expansion"

**Assessment**: This is actually clean — #17 generates source-language subtitles, #18 translates them. The #18 doc already documents this split correctly. **No action needed** — just ensure #17 is the sole owner of subtitle generation and #18 only translates existing SRTs.

---

### OVERLAP 5: Brand Voice Injection — Modules #1, #12

**Problem**: Both touch prompt enrichment.

- #1 Creative Director Agent: "AGENT framework for system prompts, structured creative direction"
- #12 Brand Voice DNA: "Injects `## Brand Voice Context` block into every content generation prompt"

**Assessment**: Clean separation — #12 provides the data (voice signature), #1 consumes it in the system prompt. **No consolidation needed**. But the injection contract should be explicit: #12 emits a text block, #1 includes it. No other module should independently inject brand voice.

---

### OVERLAP 6: Template Scoring — #22, Template Library

**Problem**: Performance Feedback Engine (#22) emits `template_priority_updates`, but Template Library Operations doc has its own `template_conversion_rank` calculation.

**Recommendation**: #22 is the sole source of performance-based scoring. Template Library should consume #22 signals, not compute its own `conversion_rank` independently. Update Template Library to mark `template_conversion_rank` as "populated by Performance Feedback Engine #22".

---

### NO OVERLAP (Confirmed Clean)

| Module | Unique Responsibility | No Conflict |
|--------|-----------------------|-------------|
| #2 Plan Review Gate | Approval checkpoint | Clean |
| #3 Revision Agent | Feedback-aware re-prompting | Clean |
| #4 Asset Analyzer | Vision analysis of uploads | Clean |
| #5 SEALCaM | Structured prompt schema | Clean |
| #6 Core Elements Board | Brand onboarding asset | Clean |
| #7 Music Engine | Music generation | Clean |
| #8 Assembly Engine | FFmpeg composition | Clean |
| #9 Provider Routing | Unified routing | Clean |
| #10 Re-entry Controller | State-aware resume | Clean |
| #11 Hook Library | Opening patterns | Clean |
| #13 Character Consistency | Multi-scene visual identity | Clean |
| #14 Template Image Composer | Template-driven image gen | Clean |
| #19 Review Packet | Structured approval objects | Clean |
| #21 Strategy Engine | Intent-to-plan | Clean |
| W6 Campaign Multiplication | Variant scaling | Clean |

---

## Part 2: Lean Touchpoint Tracking (No Payload Bloat)

Enterprise-grade observability without dragging full payloads through the system.

### Design Principle: **Reference IDs, Not Data Copies**

Every touchpoint logs a **signal row** with foreign key references — never duplicating the actual content, prompt, or media payload.

### Touchpoint Event Schema

```text
touchpoint_events table
──────────────────────────────────────
id              UUID PK
job_id          UUID FK → jobs
stage           TEXT (e.g. "asset_analysis", "generation", "post_production")
module_id       INTEGER (1-22, which engine handled this)
provider_id     TEXT (e.g. "kie_ai", "elevenlabs")
action          TEXT (e.g. "generate", "score", "route", "approve")
tier            TEXT ("draft" | "standard" | "premium")
status          TEXT ("started" | "completed" | "failed" | "skipped")
cost_usd        NUMERIC (nullable — only for billable actions)
latency_ms      INTEGER
error_code      TEXT (nullable)
metadata        JSONB (max 1KB — scores, counts, flags only — NO prompts, NO media URLs)
created_at      TIMESTAMPTZ
──────────────────────────────────────
```

### What Goes in `metadata` (Lean)

```json
{
  "variant_count": 3,
  "selected_variant": 2,
  "naturalness_score": 8.5,
  "voice_quality_score": 82,
  "hook_style": "question",
  "fallback_used": false
}
```

### What Does NOT Go in `metadata`

- Prompts (live in `job_stages.input_params`)
- Media URLs (live in `artifacts` table)
- Full schemas (live in their source tables)
- User input (lives in `jobs.brief`)

### Indexes (Query-Optimized)

```sql
CREATE INDEX idx_touchpoints_job ON touchpoint_events(job_id);
CREATE INDEX idx_touchpoints_module ON touchpoint_events(module_id, status);
CREATE INDEX idx_touchpoints_provider ON touchpoint_events(provider_id, status);
CREATE INDEX idx_touchpoints_created ON touchpoint_events(created_at);
```

### What This Enables

| Query | How |
|-------|-----|
| "Show me every step of job X" | `WHERE job_id = X ORDER BY created_at` |
| "Which provider is failing?" | `WHERE status = 'failed' GROUP BY provider_id` |
| "What's our P95 latency per module?" | `GROUP BY module_id, percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)` |
| "How much did this brand spend?" | `JOIN jobs ON brand_id, SUM(cost_usd)` |
| "Which stages are bottlenecks?" | `GROUP BY stage, AVG(latency_ms)` |

### Data Retention Policy

| Age | Action |
|-----|--------|
| 0-90 days | Full resolution — all touchpoints queryable |
| 90-365 days | Aggregate — roll up to daily summaries per module/provider |
| 365+ days | Archive — move to cold storage, keep monthly summaries |

---

## Part 3: Consolidation Plan — File Changes

### Files to Update (6)

| File | Change |
|------|--------|
| `docs/engines/VOICE_MANAGEMENT_ENGINE.md` | Add explicit ownership boundary: #20 is the ONLY voice provider caller. Add section "Relationship to #16 and #15" clarifying they are workflow consumers, not voice providers. |
| `docs/engines/UGC_VOICEOVER_EXTENSION.md` | Remove ElevenLabs-specific logic. Replace with "Calls Voice Management Engine (#20) for all TTS operations." Keep script auto-generation as unique responsibility. |
| `docs/engines/SPOKESPERSON_MOTION_VARIANT_ENGINE.md` | Remove TTS references. Add "Voice audio generated via Voice Management Engine (#20)." |
| `docs/engines/DELIVERY_POST_PRODUCTION_ENGINE.md` | Remove ElevenLabs dubbing references. Replace with "Dubbing via Voice Management Engine (#20), requested by Localization Engine (#18)." Clarify audio polish scope: final mix only. |
| `docs/engines/TEMPLATE_LIBRARY_OPERATIONS.md` | Update `template_conversion_rank` to "Populated by Performance Feedback Engine (#22) — do not compute independently." |
| `docs/PIPELINE_CONTRACTS.md` | Add Touchpoint Event contract. Add lean tracking section. |

### New Section to Add: `docs/PIPELINE_CONTRACTS.md`

Add the Touchpoint Event schema as a shared contract so all modules log consistently.

### No New Files Needed

The touchpoint system is a shared contract, not a new engine. It belongs in PIPELINE_CONTRACTS as a cross-cutting concern.

---

## Summary

| Finding | Action | Impact |
|---------|--------|--------|
| Voice logic in 3 modules (#15, #16, #20) | #20 sole owner, #15/#16 become consumers | Eliminates 2 duplicate provider paths |
| Audio polish in 2 modules (#17, #20) | Clarify: #20 = voice stems, #17 = final mix | Documentation fix only |
| Dubbing in 3 modules (#17, #18, #20) | #18 requests, #20 executes, #17 integrates | Eliminates 2 duplicate ElevenLabs references |
| Template scoring in 2 places (#22, Template Lib) | #22 sole source of performance scoring | Eliminates duplicate computation |
| No touchpoint tracking system | Add lean `touchpoint_events` table contract | Full observability, zero payload bloat |

**Module count stays at 22** — no new engines, no removals. Just cleaner boundaries.

