# F1 UGC Video Job — Full Observability Trace Example

> **Purpose**: Traces a single F1 UGC Video job through all 4 observability layers  
> **Job scenario**: User "Marcus" generates a 24-second (3-clip) UGC-style product demo for a fitness supplement brand  
> **Total pipeline duration**: ~6 minutes 38 seconds  
> **Total cost**: $0.83 (production tier, with voiceover + music)

---

## Job Context

```yaml
job_id:        "f1a1b2c3-0001-4000-a000-000000000001"
brand_id:      "b1b2c3d4-0002-4000-b000-000000000005"
family:        "F1"
user:          "marcus@fitbrand.com"
user_id:       "u1b2c3d4-0002-4000-c000-000000000006"
tier:          "production"
input_brief:
  reference_image: "storage://brands/b2/products/supplement-bottle.jpg"
  video_count:     3
  dialogue:        "This changed my morning routine. One scoop, 30 seconds, done."
  model:           "female_25_athletic"
  aspect_ratio:    "9:16"
  music:           true
  music_mood:      "energetic lifestyle"
  voiceover:       true
  special_requests: "Show product in hand, gym setting, natural lighting"
```

---

## Layer 0: Touchpoint Events (Raw Signals)

These are the raw `touchpoint_events` rows emitted as the job progresses.

| # | `touchpoint_id` | `job_id` | `module_id` | `event_type` | `provider_id` | `status` | `latency_ms` | `cost_usd` | `metadata` (≤1KB) |
|---|-----------------|----------|-------------|--------------|----------------|----------|--------------|------------|---------------------|
| 1 | `tp-101` | `...0001` | 4 | `asset_analysis` | `gemini` | completed | 2,810 | 0.00 | `{"product_detected":true,"category":"supplement","resolution":"1200x1600","bg_complexity":"low"}` |
| 2 | `tp-102` | `...0001` | 11 | `hook_query` | `internal` | completed | 38 | 0.00 | `{"industry":"fitness","hooks_returned":6,"top_hook":"transformation_reveal"}` |
| 3 | `tp-103` | `...0001` | 12 | `brand_voice_inject` | `internal` | completed | 22 | 0.00 | `{"voice_signature":"casual_authentic","tone_markers":["relatable","direct"]}` |
| 4 | `tp-104` | `...0001` | 1 | `creative_direction` | `gemini` | completed | 5,240 | 0.00 | `{"scenes":3,"duration_per_scene_s":8,"total_duration_s":24,"narrative_arc":"problem_solution_proof"}` |
| 5 | `tp-105` | `...0001` | 2 | `plan_review` | `internal` | completed | 95,000 | 0.00 | `{"wait_type":"user_approval","revision_count":0}` |
| 6 | `tp-106` | `...0001` | 13 | `character_ref_gen` | `fal_ai` | completed | 8,400 | 0.04 | `{"model":"female_25_athletic","base_frame_generated":true,"consistency_seed":"seed_7a3b"}` |
| 7 | `tp-107` | `...0001` | 5 | `sealcam_prompt_1` | `internal` | completed | 85 | 0.00 | `{"scene":1,"prompt_tokens":340,"start_frame":"product_closeup"}` |
| 8 | `tp-108` | `...0001` | 5 | `sealcam_prompt_2` | `internal` | completed | 78 | 0.00 | `{"scene":2,"prompt_tokens":355,"start_frame":"model_gym_context"}` |
| 9 | `tp-109` | `...0001` | 5 | `sealcam_prompt_3` | `internal` | completed | 82 | 0.00 | `{"scene":3,"prompt_tokens":328,"start_frame":"morning_routine_reveal"}` |
| 10 | `tp-110` | `...0001` | 9 | `video_gen_clip_1` | `kie_ai` | completed | 52,300 | 0.12 | `{"model":"kling_2.1","scene":1,"duration_s":8,"tier":"production"}` |
| 11 | `tp-111` | `...0001` | 9 | `video_gen_clip_2` | `kie_ai` | completed | 48,700 | 0.12 | `{"model":"kling_2.1","scene":2,"duration_s":8,"tier":"production"}` |
| 12 | `tp-112` | `...0001` | 9 | `video_gen_clip_3` | `kie_ai` | completed | 51,100 | 0.12 | `{"model":"kling_2.1","scene":3,"duration_s":8,"tier":"production"}` |
| 13 | `tp-113` | `...0001` | 20 | `voice_tts` | `elevenlabs` | completed | 3,850 | 0.02 | `{"voice_id":"el_voice_fitness01","mode":"preset","chars":68,"duration_s":6}` |
| 14 | `tp-114` | `...0001` | 7 | `music_generation` | `kie_ai` | completed | 35,200 | 0.07 | `{"model":"suno-v4","mood":"energetic_lifestyle","duration_s":24}` |
| 15 | `tp-115` | `...0001` | 8 | `assembly_merge` | `fal_ai` | completed | 18,600 | 0.04 | `{"clips":3,"layers":["video","voice","music"],"output_format":"mp4","total_duration_s":24}` |
| 16 | `tp-116` | `...0001` | 17 | `postprod_subtitles` | `byteplus` | completed | 6,800 | 0.03 | `{"subtitle_format":"burn_in","word_count":14}` |
| 17 | `tp-117` | `...0001` | 17 | `postprod_enhancement` | `byteplus` | completed | 14,200 | 0.05 | `{"operations":["color_grade","denoise","loudness_norm"]}` |
| 18 | `tp-118` | `...0001` | 17 | `postprod_watermark` | `byteplus` | completed | 2,900 | 0.02 | `{"type":"review_watermark","opacity":0.3}` |
| 19 | `tp-119` | `...0001` | 17 | `postprod_thumbnail` | `byteplus` | completed | 2,600 | 0.02 | `{"source":"frame_extraction","scenes_sampled":3}` |
| 20 | `tp-120` | `...0001` | 17 | `postprod_export` | `byteplus` | completed | 5,800 | 0.03 | `{"presets":["instagram_reels","tiktok","youtube_shorts"]}` |

**Total touchpoint rows**: 20  
**Total cost across touchpoints**: $0.68 (observability mirror — NOT used for billing)

> **Note**: Touchpoint total ($0.68) differs from billing total ($0.83) because `plan_review` wait time, internal modules, and SealCaM prompt building have zero provider cost but billable platform fee ($0.15) is applied at job level in `job_stages`.

---

## Layer 1: Event Bus (Correlation & Replay Chain)

```
correlation_id: "corr-f1-0001"
(All events from Marcus clicking "Generate UGC Video")
```

| seq | `event_id` | `parent_event_id` | `module_id` | `event_type` | `stage` | `status` | `duration_ms` | `touchpoint_id` | `context` |
|-----|------------|-------------------|-------------|--------------|---------|----------|---------------|-----------------|-----------|
| 1 | `eb-101` | — | — | `intake.brief_received` | brief_intake | completed | 45 | — | `{"family":"F1","clips":3,"voiceover":true}` |
| 2 | `eb-102` | `eb-101` | 4 | `analysis.started` | asset_analysis | started | — | — | `{}` |
| 3 | `eb-103` | `eb-102` | 4 | `analysis.completed` | asset_analysis | completed | 2,810 | `tp-101` | `{"product":"supplement","bg":"low"}` |
| 4 | `eb-104` | `eb-103` | 11 | `planning.hook_queried` | planning | completed | 38 | `tp-102` | `{"hooks_returned":6}` |
| 5 | `eb-105` | `eb-103` | 12 | `planning.brand_voice_injected` | planning | completed | 22 | `tp-103` | `{"tone":"casual_authentic"}` |
| 6 | `eb-106` | `eb-104,eb-105` | 1 | `planning.plan_generated` | planning | completed | 5,240 | `tp-104` | `{"scenes":3,"arc":"problem_solution_proof"}` |
| 7 | `eb-107` | `eb-106` | 19 | `review.packet_created` | plan_review | completed | 180 | — | `{"packet_type":"scene_breakdown"}` |
| 8 | `eb-108` | `eb-107` | 2 | `review.approved` | plan_review | completed | 95,000 | `tp-105` | `{"approval_decision":"approved"}` |
| 9 | `eb-109` | `eb-108` | 13 | `generation.character_ref` | character_setup | completed | 8,400 | `tp-106` | `{"consistency_seed":"seed_7a3b"}` |
| 10 | `eb-110` | `eb-109` | 5 | `generation.sealcam_scene_1` | prompt_build | completed | 85 | `tp-107` | `{"scene":1}` |
| 11 | `eb-111` | `eb-109` | 5 | `generation.sealcam_scene_2` | prompt_build | completed | 78 | `tp-108` | `{"scene":2}` |
| 12 | `eb-112` | `eb-109` | 5 | `generation.sealcam_scene_3` | prompt_build | completed | 82 | `tp-109` | `{"scene":3}` |
| 13 | `eb-113` | `eb-110` | 9 | `generation.clip_1` | video_generation | completed | 52,300 | `tp-110` | `{"provider":"kie_ai"}` |
| 14 | `eb-114` | `eb-111` | 9 | `generation.clip_2` | video_generation | completed | 48,700 | `tp-111` | `{"provider":"kie_ai"}` |
| 15 | `eb-115` | `eb-112` | 9 | `generation.clip_3` | video_generation | completed | 51,100 | `tp-112` | `{"provider":"kie_ai"}` |
| 16 | `eb-116` | `eb-108` | 20 | `voice.tts_requested` | voice_generation | started | — | — | `{"voice_id":"el_voice_fitness01"}` |
| 17 | `eb-117` | `eb-116` | 20 | `voice.tts_completed` | voice_generation | completed | 3,850 | `tp-113` | `{"duration_s":6}` |
| 18 | `eb-118` | `eb-108` | 7 | `generation.music_started` | music | started | — | — | `{"mood":"energetic_lifestyle"}` |
| 19 | `eb-119` | `eb-118` | 7 | `generation.music_completed` | music | completed | 35,200 | `tp-114` | `{}` |
| 20 | `eb-120` | `eb-113,eb-114,eb-115,eb-117,eb-119` | 8 | `assembly.started` | assembly | started | — | — | `{"clips":3,"layers":3}` |
| 21 | `eb-121` | `eb-120` | 8 | `assembly.completed` | assembly | completed | 18,600 | `tp-115` | `{"total_duration_s":24}` |
| 22 | `eb-122` | `eb-121` | 17 | `postprod.subtitles_added` | post_production | completed | 6,800 | `tp-116` | `{}` |
| 23 | `eb-123` | `eb-122` | 17 | `postprod.enhanced` | post_production | completed | 14,200 | `tp-117` | `{}` |
| 24 | `eb-124` | `eb-123` | 17 | `postprod.watermark_applied` | post_production | completed | 2,900 | `tp-118` | `{"version":"review"}` |
| 25 | `eb-125` | `eb-124` | 17 | `postprod.exported` | post_production | completed | 5,800 | `tp-120` | `{"preset_count":3}` |
| 26 | `eb-126` | `eb-125` | 17 | `delivery.review_copy_ready` | delivery | completed | 90 | — | `{}` |

**Total event_bus rows**: 26

### Cause-Effect Chain Visualization

```
eb-101 intake.brief_received
  └─ eb-102 analysis.started
       └─ eb-103 analysis.completed
            ├─ eb-104 planning.hook_queried ──────┐
            └─ eb-105 planning.brand_voice_injected─┤
                                                    │
            eb-106 planning.plan_generated ◄────────┘
              └─ eb-107 review.packet_created
                   └─ eb-108 review.approved ─────────────────────────────┐
                        │                                                  │
                        ├─ eb-109 generation.character_ref                 │
                        │    ├─ eb-110 sealcam_scene_1                     │  (3 parallel
                        │    │    └─ eb-113 clip_1 generated ──────┐       │   clip lanes)
                        │    ├─ eb-111 sealcam_scene_2             │       │
                        │    │    └─ eb-114 clip_2 generated ──────┤       │
                        │    └─ eb-112 sealcam_scene_3             │       │
                        │         └─ eb-115 clip_3 generated ─────┤       │
                        │                                          │       │
                        ├─ eb-116 voice.tts_requested              │       │
                        │    └─ eb-117 voice.tts_completed ────────┤       │
                        │                                          │       │
                        └─ eb-118 music.started                    │       │
                             └─ eb-119 music.completed ────────────┤       │
                                                                   │       │
                        eb-120 assembly.started ◄──────────────────┘       │
                          └─ eb-121 assembly.completed                     │
                               └─ eb-122 postprod.subtitles_added          │
                                    └─ eb-123 postprod.enhanced            │
                                         └─ eb-124 postprod.watermark      │
                                              └─ eb-125 postprod.exported  │
                                                   └─ eb-126 delivery.ready│
```

### Key Difference from F2

F1 has **parallel clip generation** (3 independent video generation lanes) vs F2's single-base + 3-variant pattern. The assembly step waits for all 3 clips + voice + music before merging.

---

## Layer 2: Metrics Rollup Contributions

### 2a. `mv_provider_health` (next refresh: ≤5 min)

| `provider_id` | `hour` | Contribution |
|----------------|--------|-------------|
| `gemini` | 2026-03-31 10:00 | +1 success, latency 2,810ms, cost $0.00 |
| `fal_ai` | 2026-03-31 10:00 | +2 successes (char ref + assembly), avg latency 13,500ms, cost $0.08 |
| `kie_ai` | 2026-03-31 10:00 | +4 successes (3 clips + 1 music), avg latency 46,825ms, cost $0.43 |
| `elevenlabs` | 2026-03-31 10:00 | +1 success, latency 3,850ms, cost $0.02 |
| `byteplus` | 2026-03-31 10:00 | +5 successes (subtitle + enhance + watermark + thumbnail + export), avg latency 6,460ms, cost $0.15 |

### 2b. `mv_module_performance` (next refresh: ≤15 min)

| `module_id` | `day` | Contribution |
|-------------|-------|-------------|
| 4 (Asset Analyzer) | 2026-03-31 | +1 execution, 2,810ms, $0.00 |
| 11 (Hook Library) | 2026-03-31 | +1 execution, 38ms, $0.00 |
| 12 (Brand Voice DNA) | 2026-03-31 | +1 execution, 22ms, $0.00 |
| 1 (Creative Director) | 2026-03-31 | +1 execution, 5,240ms, $0.00 |
| 13 (Character Consistency) | 2026-03-31 | +1 execution, 8,400ms, $0.04 |
| 5 (SEALCaM) | 2026-03-31 | +3 executions, avg 82ms, $0.00 |
| 9 (Provider Routing) | 2026-03-31 | +3 executions, avg 50,700ms, $0.36 |
| 20 (Voice Mgmt) | 2026-03-31 | +1 execution, 3,850ms, $0.02 |
| 7 (Music Engine) | 2026-03-31 | +1 execution, 35,200ms, $0.07 |
| 8 (Assembly) | 2026-03-31 | +1 execution, 18,600ms, $0.04 |
| 17 (Post-Production) | 2026-03-31 | +5 executions, avg 6,460ms, $0.15 |

### 2c. `mv_brand_analytics` (next refresh: ≤30 min)

| `brand_id` | `week` | `family` | Contribution |
|------------|--------|----------|-------------|
| `b1b2...0005` | 2026-W14 | F1 | +1 job, +$0.83 spend, turnaround 398s, 0 revisions, 1 approval |

### 2d. `mv_family_throughput` (next refresh: ≤15 min)

| `family` | `day` | Contribution |
|----------|-------|-------------|
| F1 | 2026-03-31 | +1 started, +1 delivered, pipeline_seconds 398 |

---

## Layer 3: Audit Trail (Immutable Records)

This job produces exactly **4 audit entries**.

| # | `action` | `actor_type` | `actor_email` | `resource_type` | `reason` | `change_summary` | `correlation_id` |
|---|----------|-------------|---------------|-----------------|----------|-------------------|-------------------|
| 1 | `review.approved` | user | marcus@fitbrand.com | review_packet | "Client approved 3-scene UGC plan with voiceover" | `{"field":"status","before":"pending_review","after":"approved"}` | `corr-f1-0001` |
| 2 | `billing.job_charged` | system | — | job | "Auto-charged on job completion" | `{"total_cost_usd":0.83,"tier":"production","family":"F1","clips":3}` | `corr-f1-0001` |
| 3 | `delivery.review_copy_ready` | system | — | artifact | "Watermarked review copy generated" | `{"watermark":true,"expiry_days":7,"clips":3}` | `corr-f1-0001` |
| 4 | `delivery.production_unlocked` | user | marcus@fitbrand.com | artifact | "Client approved final review" | `{"field":"access","before":"watermarked","after":"production_unlocked"}` | `corr-f1-0001` |

---

## Billing Cross-Reference

| `job_stages` entry | `stage` | `cost` (JSONB) |
|--------------------|---------|----------------|
| `js-101` | asset_analysis | `{"cost_usd": 0.00}` |
| `js-102` | character_setup | `{"cost_usd": 0.04, "provider": "fal_ai"}` |
| `js-103` | video_generation | `{"cost_usd": 0.36, "clip_count": 3, "provider": "kie_ai", "model": "kling_2.1"}` |
| `js-104` | voice_generation | `{"cost_usd": 0.02, "voice_total": 0.02}` |
| `js-105` | music | `{"cost_usd": 0.07}` |
| `js-106` | assembly | `{"cost_usd": 0.04}` |
| `js-107` | post_production | `{"cost_usd": 0.15, "breakdown": {"subtitles": 0.03, "enhancement": 0.05, "watermark": 0.02, "thumbnail": 0.02, "export": 0.03}}` |
| `js-108` | platform_fee | `{"cost_usd": 0.15, "note": "orchestration + internal modules"}` |

**Billing total**: $0.83 (sum of `job_stages.cost.cost_usd`)  
**Touchpoint total**: $0.68 (observability mirror — excludes platform fee)

---

## Data Volume Per Job

| Layer | Rows | Avg Row Size | Total |
|-------|------|-------------|-------|
| Layer 0 (Touchpoint) | 20 | ~200 bytes | ~4.0 KB |
| Layer 1 (Event Bus) | 26 | ~180 bytes | ~4.7 KB |
| Layer 2 (Metrics) | — | Aggregated | 0 (rollup) |
| Layer 3 (Audit) | 4 | ~300 bytes | ~1.2 KB |
| **Total per job** | **50 rows** | | **~9.9 KB** |

F1 is slightly heavier than F2 due to multi-clip parallel generation lanes and character consistency setup.
