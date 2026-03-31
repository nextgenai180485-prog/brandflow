# F5 Cinematic Ad Job — Full Observability Trace Example

> **Purpose**: Traces a single F5 Cinematic Ad job through all 4 observability layers  
> **Job scenario**: User "Priya" generates a 45-second cinematic ad for a luxury watch brand with voiceover, music, and multi-scene character consistency  
> **Total pipeline duration**: ~9 minutes 15 seconds  
> **Total cost**: $1.42 (production tier, full cinematic treatment)

---

## Job Context

```yaml
job_id:        "f5a1b2c3-0001-4000-a000-000000000001"
brand_id:      "b1b2c3d4-0003-4000-b000-000000000008"
family:        "F5"
user:          "priya@luxwatches.com"
user_id:       "u1b2c3d4-0003-4000-c000-000000000009"
tier:          "production"
input_brief:
  creative_direction: "Cinematic product showcase. A man walks through a rain-drenched city at night, glancing at his wrist. Time slows. The watch catches the light."
  core_image:         "storage://brands/b3/products/chronograph-hero.jpg"
  core_elements_board: "storage://brands/b3/boards/luxury-board-v2.png"
  aspect_ratio:       "16:9"
  voice_id:           "el_voice_deep_narrator"
  voiceover_script:   "Time doesn't stop for anyone. But the right moment — you feel it."
  music_mood:         "cinematic tension, orchestral"
  scenes_requested:   5
  character_model:    "male_35_sophisticated"
```

---

## Layer 0: Touchpoint Events (Raw Signals)

| # | `touchpoint_id` | `job_id` | `module_id` | `event_type` | `provider_id` | `status` | `latency_ms` | `cost_usd` | `metadata` (≤1KB) |
|---|-----------------|----------|-------------|--------------|----------------|----------|--------------|------------|---------------------|
| 1 | `tp-501` | `...0001` | 4 | `asset_analysis` | `gemini` | completed | 3,120 | 0.00 | `{"product":"watch","category":"luxury","resolution":"2400x1600","bg_complexity":"medium"}` |
| 2 | `tp-502` | `...0001` | 6 | `core_elements_read` | `internal` | completed | 35 | 0.00 | `{"board_version":"v2","elements":["character","product","setting","palette"]}` |
| 3 | `tp-503` | `...0001` | 11 | `hook_query` | `internal` | completed | 42 | 0.00 | `{"industry":"luxury","hooks_returned":4,"top_hook":"cinematic_slowmo"}` |
| 4 | `tp-504` | `...0001` | 12 | `brand_voice_inject` | `internal` | completed | 28 | 0.00 | `{"voice_signature":"premium_aspirational","tone_markers":["authoritative","restrained"]}` |
| 5 | `tp-505` | `...0001` | 1 | `creative_direction` | `gemini` | completed | 7,800 | 0.00 | `{"scenes":5,"duration_per_scene_s":9,"total_duration_s":45,"narrative_arc":"tension_reveal_desire"}` |
| 6 | `tp-506` | `...0001` | 2 | `plan_review` | `internal` | completed | 142,000 | 0.00 | `{"wait_type":"user_approval","revision_count":1}` |
| 7 | `tp-507` | `...0001` | 3 | `revision_applied` | `gemini` | completed | 4,100 | 0.00 | `{"revision_type":"scene_reorder","scenes_affected":[3,4],"iteration":1}` |
| 8 | `tp-508` | `...0001` | 2 | `plan_review_r2` | `internal` | completed | 68,000 | 0.00 | `{"wait_type":"user_approval","revision_count":0,"final_approval":true}` |
| 9 | `tp-509` | `...0001` | 13 | `character_ref_gen` | `fal_ai` | completed | 9,200 | 0.04 | `{"model":"male_35_sophisticated","base_frames":2,"consistency_seed":"seed_9c4d"}` |
| 10 | `tp-510` | `...0001` | 5 | `sealcam_prompt_1` | `internal` | completed | 105 | 0.00 | `{"scene":1,"prompt_tokens":420,"camera":"tracking_shot","lighting":"neon_rain"}` |
| 11 | `tp-511` | `...0001` | 5 | `sealcam_prompt_2` | `internal` | completed | 98 | 0.00 | `{"scene":2,"prompt_tokens":395,"camera":"close_up","lighting":"streetlamp_highlight"}` |
| 12 | `tp-512` | `...0001` | 5 | `sealcam_prompt_3` | `internal` | completed | 112 | 0.00 | `{"scene":3,"prompt_tokens":410,"camera":"dolly_zoom","lighting":"watch_face_glow"}` |
| 13 | `tp-513` | `...0001` | 5 | `sealcam_prompt_4` | `internal` | completed | 95 | 0.00 | `{"scene":4,"prompt_tokens":388,"camera":"slow_motion","lighting":"rain_backlit"}` |
| 14 | `tp-514` | `...0001` | 5 | `sealcam_prompt_5` | `internal` | completed | 108 | 0.00 | `{"scene":5,"prompt_tokens":445,"camera":"crane_up","lighting":"dawn_golden"}` |
| 15 | `tp-515` | `...0001` | 9 | `video_gen_scene_1` | `kie_ai` | completed | 65,400 | 0.15 | `{"model":"veo3_fast","scene":1,"duration_s":9,"tier":"production"}` |
| 16 | `tp-516` | `...0001` | 9 | `video_gen_scene_2` | `kie_ai` | completed | 62,100 | 0.15 | `{"model":"veo3_fast","scene":2,"duration_s":9,"tier":"production"}` |
| 17 | `tp-517` | `...0001` | 9 | `video_gen_scene_3` | `kie_ai` | completed | 68,700 | 0.15 | `{"model":"veo3_fast","scene":3,"duration_s":9,"tier":"production"}` |
| 18 | `tp-518` | `...0001` | 9 | `video_gen_scene_4` | `kie_ai` | completed | 59,800 | 0.15 | `{"model":"veo3_fast","scene":4,"duration_s":9,"tier":"production"}` |
| 19 | `tp-519` | `...0001` | 9 | `video_gen_scene_5` | `kie_ai` | completed | 63,200 | 0.15 | `{"model":"veo3_fast","scene":5,"duration_s":9,"tier":"production"}` |
| 20 | `tp-520` | `...0001` | 20 | `voice_tts` | `elevenlabs` | completed | 3,400 | 0.02 | `{"voice_id":"el_voice_deep_narrator","mode":"preset","chars":82,"duration_s":8}` |
| 21 | `tp-521` | `...0001` | 7 | `music_generation` | `kie_ai` | completed | 52,800 | 0.10 | `{"model":"suno-v4","mood":"cinematic_orchestral","duration_s":45}` |
| 22 | `tp-522` | `...0001` | 8 | `assembly_merge` | `fal_ai` | completed | 28,400 | 0.06 | `{"clips":5,"layers":["video","voice","music"],"transitions":["crossfade"],"total_duration_s":45}` |
| 23 | `tp-523` | `...0001` | 17 | `postprod_subtitles` | `byteplus` | completed | 7,200 | 0.03 | `{"subtitle_format":"cinematic_lower_third","word_count":18}` |
| 24 | `tp-524` | `...0001` | 17 | `postprod_enhancement` | `byteplus` | completed | 22,400 | 0.08 | `{"operations":["color_grade_cinematic","film_grain","loudness_norm","dynamic_range"]}` |
| 25 | `tp-525` | `...0001` | 17 | `postprod_watermark` | `byteplus` | completed | 3,400 | 0.02 | `{"type":"review_watermark","opacity":0.25}` |
| 26 | `tp-526` | `...0001` | 17 | `postprod_thumbnail` | `byteplus` | completed | 3,200 | 0.02 | `{"source":"frame_extraction","scenes_sampled":5,"hero_frame_scene":3}` |
| 27 | `tp-527` | `...0001` | 17 | `postprod_export` | `byteplus` | completed | 8,400 | 0.04 | `{"presets":["youtube_16_9","facebook_feed","cinema_prores"]}` |

**Total touchpoint rows**: 27  
**Total cost across touchpoints**: $1.16 (observability mirror — NOT used for billing)

---

## Layer 1: Event Bus (Correlation & Replay Chain)

```
correlation_id: "corr-f5-0001"
(All events from Priya clicking "Generate Cinematic Ad")
```

| seq | `event_id` | `parent_event_id` | `module_id` | `event_type` | `stage` | `status` | `duration_ms` | `touchpoint_id` | `context` |
|-----|------------|-------------------|-------------|--------------|---------|----------|---------------|-----------------|-----------|
| 1 | `eb-501` | — | — | `intake.brief_received` | brief_intake | completed | 55 | — | `{"family":"F5","scenes":5,"voiceover":true}` |
| 2 | `eb-502` | `eb-501` | 4 | `analysis.started` | asset_analysis | started | — | — | `{}` |
| 3 | `eb-503` | `eb-502` | 4 | `analysis.completed` | asset_analysis | completed | 3,120 | `tp-501` | `{"product":"watch","category":"luxury"}` |
| 4 | `eb-504` | `eb-503` | 6 | `planning.core_elements_loaded` | planning | completed | 35 | `tp-502` | `{"board":"v2"}` |
| 5 | `eb-505` | `eb-503` | 11 | `planning.hook_queried` | planning | completed | 42 | `tp-503` | `{"hooks_returned":4}` |
| 6 | `eb-506` | `eb-503` | 12 | `planning.brand_voice_injected` | planning | completed | 28 | `tp-504` | `{"tone":"premium_aspirational"}` |
| 7 | `eb-507` | `eb-504,eb-505,eb-506` | 1 | `planning.plan_generated` | planning | completed | 7,800 | `tp-505` | `{"scenes":5,"arc":"tension_reveal_desire"}` |
| 8 | `eb-508` | `eb-507` | 19 | `review.packet_created` | plan_review | completed | 220 | — | `{"packet_type":"cinematic_storyboard"}` |
| 9 | `eb-509` | `eb-508` | 2 | `review.revision_requested` | plan_review | completed | 142,000 | `tp-506` | `{"revision_type":"scene_reorder"}` |
| 10 | `eb-510` | `eb-509` | 3 | `revision.applied` | revision | completed | 4,100 | `tp-507` | `{"scenes_affected":[3,4],"iteration":1}` |
| 11 | `eb-511` | `eb-510` | 19 | `review.packet_updated` | plan_review | completed | 150 | — | `{"packet_type":"revised_storyboard"}` |
| 12 | `eb-512` | `eb-511` | 2 | `review.approved` | plan_review | completed | 68,000 | `tp-508` | `{"approval_decision":"approved","revision_rounds":1}` |
| 13 | `eb-513` | `eb-512` | 13 | `generation.character_ref` | character_setup | completed | 9,200 | `tp-509` | `{"consistency_seed":"seed_9c4d","frames":2}` |
| 14 | `eb-514` | `eb-513` | 5 | `generation.sealcam_scene_1` | prompt_build | completed | 105 | `tp-510` | `{"scene":1}` |
| 15 | `eb-515` | `eb-513` | 5 | `generation.sealcam_scene_2` | prompt_build | completed | 98 | `tp-511` | `{"scene":2}` |
| 16 | `eb-516` | `eb-513` | 5 | `generation.sealcam_scene_3` | prompt_build | completed | 112 | `tp-512` | `{"scene":3}` |
| 17 | `eb-517` | `eb-513` | 5 | `generation.sealcam_scene_4` | prompt_build | completed | 95 | `tp-513` | `{"scene":4}` |
| 18 | `eb-518` | `eb-513` | 5 | `generation.sealcam_scene_5` | prompt_build | completed | 108 | `tp-514` | `{"scene":5}` |
| 19 | `eb-519` | `eb-514` | 9 | `generation.scene_1` | video_generation | completed | 65,400 | `tp-515` | `{"provider":"kie_ai","model":"veo3_fast"}` |
| 20 | `eb-520` | `eb-515` | 9 | `generation.scene_2` | video_generation | completed | 62,100 | `tp-516` | `{"provider":"kie_ai"}` |
| 21 | `eb-521` | `eb-516` | 9 | `generation.scene_3` | video_generation | completed | 68,700 | `tp-517` | `{"provider":"kie_ai"}` |
| 22 | `eb-522` | `eb-517` | 9 | `generation.scene_4` | video_generation | completed | 59,800 | `tp-518` | `{"provider":"kie_ai"}` |
| 23 | `eb-523` | `eb-518` | 9 | `generation.scene_5` | video_generation | completed | 63,200 | `tp-519` | `{"provider":"kie_ai"}` |
| 24 | `eb-524` | `eb-512` | 20 | `voice.tts_requested` | voice_generation | started | — | — | `{"voice_id":"el_voice_deep_narrator"}` |
| 25 | `eb-525` | `eb-524` | 20 | `voice.tts_completed` | voice_generation | completed | 3,400 | `tp-520` | `{"duration_s":8}` |
| 26 | `eb-526` | `eb-512` | 7 | `generation.music_started` | music | started | — | — | `{"mood":"cinematic_orchestral"}` |
| 27 | `eb-527` | `eb-526` | 7 | `generation.music_completed` | music | completed | 52,800 | `tp-521` | `{"duration_s":45}` |
| 28 | `eb-528` | `eb-519,eb-520,eb-521,eb-522,eb-523,eb-525,eb-527` | 8 | `assembly.started` | assembly | started | — | — | `{"clips":5,"layers":3,"transitions":"crossfade"}` |
| 29 | `eb-529` | `eb-528` | 8 | `assembly.completed` | assembly | completed | 28,400 | `tp-522` | `{"total_duration_s":45}` |
| 30 | `eb-530` | `eb-529` | 17 | `postprod.subtitles_added` | post_production | completed | 7,200 | `tp-523` | `{"style":"cinematic_lower_third"}` |
| 31 | `eb-531` | `eb-530` | 17 | `postprod.enhanced` | post_production | completed | 22,400 | `tp-524` | `{"grade":"cinematic","film_grain":true}` |
| 32 | `eb-532` | `eb-531` | 17 | `postprod.watermark_applied` | post_production | completed | 3,400 | `tp-525` | `{"version":"review"}` |
| 33 | `eb-533` | `eb-532` | 17 | `postprod.exported` | post_production | completed | 8,400 | `tp-527` | `{"preset_count":3,"includes_prores":true}` |
| 34 | `eb-534` | `eb-533` | 17 | `delivery.review_copy_ready` | delivery | completed | 110 | — | `{}` |

**Total event_bus rows**: 34

### Cause-Effect Chain Visualization

```
eb-501 intake.brief_received
  └─ eb-502 analysis.started
       └─ eb-503 analysis.completed
            ├─ eb-504 core_elements_loaded ─────────┐
            ├─ eb-505 planning.hook_queried ─────────┤
            └─ eb-506 planning.brand_voice_injected ─┤
                                                     │
            eb-507 planning.plan_generated ◄─────────┘
              └─ eb-508 review.packet_created
                   └─ eb-509 review.REVISION_REQUESTED ◄──── (user wants scene reorder)
                        └─ eb-510 revision.applied
                             └─ eb-511 review.packet_updated
                                  └─ eb-512 review.approved ──────────────────────────────────┐
                                       │                                                       │
                                       ├─ eb-513 character_ref ───────────────────────┐        │
                                       │    ├─ eb-514 sealcam_scene_1                 │        │
                                       │    │    └─ eb-519 scene_1 generated ─────┐   │  (5 parallel
                                       │    ├─ eb-515 sealcam_scene_2             │   │   scene lanes)
                                       │    │    └─ eb-520 scene_2 generated ─────┤   │
                                       │    ├─ eb-516 sealcam_scene_3             │   │
                                       │    │    └─ eb-521 scene_3 generated ─────┤   │
                                       │    ├─ eb-517 sealcam_scene_4             │   │
                                       │    │    └─ eb-522 scene_4 generated ─────┤   │
                                       │    └─ eb-518 sealcam_scene_5             │   │
                                       │         └─ eb-523 scene_5 generated ─────┤   │
                                       │                                          │   │
                                       ├─ eb-524 voice.tts_requested              │   │
                                       │    └─ eb-525 voice.tts_completed ────────┤   │
                                       │                                          │   │
                                       └─ eb-526 music.started                    │   │
                                            └─ eb-527 music.completed ────────────┤   │
                                                                                  │   │
                                       eb-528 assembly.started ◄──────────────────┘   │
                                         └─ eb-529 assembly.completed                 │
                                              └─ eb-530 postprod.subtitles            │
                                                   └─ eb-531 postprod.enhanced         │
                                                        └─ eb-532 postprod.watermark   │
                                                             └─ eb-533 postprod.exported│
                                                                  └─ eb-534 delivery   │
```

### Key Differences from F1 and F2

| Aspect | F1 UGC | F2 Spokesperson | F5 Cinematic |
|--------|--------|-----------------|--------------|
| Scenes | 3 clips (parallel) | 1 base + 3 variants | 5 scenes (parallel) |
| Revision loop | None in example | None in example | **1 revision round** |
| Character consistency | Single model ref | Single photo | Multi-scene with seed |
| Music | Standard | Standard | Extended cinematic |
| Post-production | Standard grade | Standard grade | **Cinematic grade + film grain** |
| ProRes export | No | No | **Yes** |
| Event bus rows | 26 | 23 | **34** |

---

## Layer 2: Metrics Rollup Contributions

### 2a. `mv_provider_health` (next refresh: ≤5 min)

| `provider_id` | `hour` | Contribution |
|----------------|--------|-------------|
| `gemini` | 2026-03-31 15:00 | +2 successes (analysis + revision), avg latency 5,460ms, cost $0.00 |
| `fal_ai` | 2026-03-31 15:00 | +2 successes (char ref + assembly), avg latency 18,800ms, cost $0.10 |
| `kie_ai` | 2026-03-31 15:00 | +6 successes (5 scenes + 1 music), avg latency 62,000ms, cost $0.85 |
| `elevenlabs` | 2026-03-31 15:00 | +1 success, latency 3,400ms, cost $0.02 |
| `byteplus` | 2026-03-31 15:00 | +5 successes (subtitle + enhance + watermark + thumbnail + export), avg latency 8,920ms, cost $0.19 |

### 2b. `mv_module_performance` (next refresh: ≤15 min)

| `module_id` | `day` | Contribution |
|-------------|-------|-------------|
| 4 (Asset Analyzer) | 2026-03-31 | +1 execution, 3,120ms, $0.00 |
| 6 (Core Elements) | 2026-03-31 | +1 execution, 35ms, $0.00 |
| 11 (Hook Library) | 2026-03-31 | +1 execution, 42ms, $0.00 |
| 12 (Brand Voice DNA) | 2026-03-31 | +1 execution, 28ms, $0.00 |
| 1 (Creative Director) | 2026-03-31 | +1 execution, 7,800ms, $0.00 |
| 3 (Revision Agent) | 2026-03-31 | +1 execution, 4,100ms, $0.00 |
| 13 (Character Consistency) | 2026-03-31 | +1 execution, 9,200ms, $0.04 |
| 5 (SEALCaM) | 2026-03-31 | +5 executions, avg 104ms, $0.00 |
| 9 (Provider Routing) | 2026-03-31 | +5 executions, avg 63,840ms, $0.75 |
| 20 (Voice Mgmt) | 2026-03-31 | +1 execution, 3,400ms, $0.02 |
| 7 (Music Engine) | 2026-03-31 | +1 execution, 52,800ms, $0.10 |
| 8 (Assembly) | 2026-03-31 | +1 execution, 28,400ms, $0.06 |
| 17 (Post-Production) | 2026-03-31 | +5 executions, avg 8,920ms, $0.19 |

### 2c. `mv_brand_analytics` (next refresh: ≤30 min)

| `brand_id` | `week` | `family` | Contribution |
|------------|--------|----------|-------------|
| `b1b2...0008` | 2026-W14 | F5 | +1 job, +$1.42 spend, turnaround 555s, 1 revision, 1 approval |

### 2d. `mv_family_throughput` (next refresh: ≤15 min)

| `family` | `day` | Contribution |
|----------|-------|-------------|
| F5 | 2026-03-31 | +1 started, +1 delivered, pipeline_seconds 555 |

---

## Layer 3: Audit Trail (Immutable Records)

F5 produces **5 audit entries** — one more than F1/F2 due to the revision round.

| # | `action` | `actor_type` | `actor_email` | `resource_type` | `reason` | `change_summary` | `correlation_id` |
|---|----------|-------------|---------------|-----------------|----------|-------------------|-------------------|
| 1 | `review.revision_requested` | user | priya@luxwatches.com | review_packet | "Client requested scene 3 and 4 reorder for pacing" | `{"field":"status","before":"pending_review","after":"revision_requested","scenes":[3,4]}` | `corr-f5-0001` |
| 2 | `review.approved` | user | priya@luxwatches.com | review_packet | "Client approved revised 5-scene cinematic storyboard" | `{"field":"status","before":"pending_review","after":"approved","revision_rounds":1}` | `corr-f5-0001` |
| 3 | `billing.job_charged` | system | — | job | "Auto-charged on job completion" | `{"total_cost_usd":1.42,"tier":"production","family":"F5","scenes":5}` | `corr-f5-0001` |
| 4 | `delivery.review_copy_ready` | system | — | artifact | "Watermarked review copy generated for cinematic ad" | `{"watermark":true,"expiry_days":7,"includes_prores":false}` | `corr-f5-0001` |
| 5 | `delivery.production_unlocked` | user | priya@luxwatches.com | artifact | "Client approved final cinematic review" | `{"field":"access","before":"watermarked","after":"production_unlocked","exports":["youtube","facebook","prores"]}` | `corr-f5-0001` |

---

## Billing Cross-Reference

| `job_stages` entry | `stage` | `cost` (JSONB) |
|--------------------|---------|----------------|
| `js-501` | asset_analysis | `{"cost_usd": 0.00}` |
| `js-502` | character_setup | `{"cost_usd": 0.04, "provider": "fal_ai", "frames": 2}` |
| `js-503` | video_generation | `{"cost_usd": 0.75, "scene_count": 5, "provider": "kie_ai", "model": "veo3_fast"}` |
| `js-504` | voice_generation | `{"cost_usd": 0.02, "voice_total": 0.02}` |
| `js-505` | music | `{"cost_usd": 0.10, "duration_s": 45}` |
| `js-506` | assembly | `{"cost_usd": 0.06, "transitions": "crossfade"}` |
| `js-507` | post_production | `{"cost_usd": 0.19, "breakdown": {"subtitles": 0.03, "enhancement": 0.08, "watermark": 0.02, "thumbnail": 0.02, "export": 0.04}}` |
| `js-508` | platform_fee | `{"cost_usd": 0.26, "note": "orchestration + revision round + internal modules"}` |

**Billing total**: $1.42 (sum of `job_stages.cost.cost_usd`)  
**Touchpoint total**: $1.16 (observability mirror — excludes platform fee)

---

## Cross-Family Comparison

| Metric | F1 UGC (3 clips) | F2 Spokesperson | F5 Cinematic (5 scenes) |
|--------|-------------------|-----------------|-------------------------|
| **Total cost** | $0.83 | $0.57 | $1.42 |
| **Pipeline time** | ~6m 38s | ~4m 12s | ~9m 15s |
| **Touchpoint rows** | 20 | 17 | 27 |
| **Event bus rows** | 26 | 23 | 34 |
| **Audit rows** | 4 | 4 | 5 |
| **Total observability rows** | 50 | 44 | 66 |
| **Data per job** | ~9.9 KB | ~8.7 KB | ~13.2 KB |
| **Parallel gen lanes** | 3 clips | 3 variants | 5 scenes |
| **Revision rounds** | 0 | 0 | 1 |
| **Unique modules used** | 11 | 9 | 13 |
| **ProRes export** | No | No | Yes |

---

## Data Volume Per Job

| Layer | Rows | Avg Row Size | Total |
|-------|------|-------------|-------|
| Layer 0 (Touchpoint) | 27 | ~200 bytes | ~5.4 KB |
| Layer 1 (Event Bus) | 34 | ~180 bytes | ~6.1 KB |
| Layer 2 (Metrics) | — | Aggregated | 0 (rollup) |
| Layer 3 (Audit) | 5 | ~300 bytes | ~1.5 KB |
| **Total per job** | **66 rows** | | **~13.2 KB** |

At 10,000 jobs/month across all families: ~110 MB raw observability data. PostgreSQL handles this comfortably with the defined retention policy (90-day full → 365-day aggregate → archive).
