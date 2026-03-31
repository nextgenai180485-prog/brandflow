# F2 Spokesperson Job — Full Observability Trace Example

> **Purpose**: Traces a single F2 AI Spokesperson job through all 4 observability layers  
> **Job scenario**: User "Sarah" generates a 30-second skincare tips spokesperson video with voice clone + background music  
> **Total pipeline duration**: ~4 minutes 12 seconds  
> **Total cost**: $0.57 (production tier, with music)

---

## Job Context

```yaml
job_id:        "a1b2c3d4-0001-4000-a000-000000000001"
brand_id:      "b1b2c3d4-0001-4000-b000-000000000002"
family:        "F2"
user:          "sarah@skincarebrand.com"
user_id:       "u1b2c3d4-0001-4000-c000-000000000003"
tier:          "production"
input_brief:
  script:      "Hey everyone! Today I want to share 3 tips for glowing skin..."
  photo:       "storage://brands/b1/spokesperson/sarah-headshot.jpg"
  voice_mode:  "clone"
  voice_id:    "el_voice_abc123"
  music:       true
  music_mood:  "upbeat corporate"
  aspect_ratio: "9:16"
  caption_style: "animated"
```

---

## Layer 0: Touchpoint Events (Raw Signals)

These are the raw `touchpoint_events` rows emitted as the job progresses. Each row is a single provider/module interaction.

| # | `touchpoint_id` | `job_id` | `module_id` | `event_type` | `provider_id` | `status` | `latency_ms` | `cost_usd` | `metadata` (≤1KB) |
|---|-----------------|----------|-------------|--------------|----------------|----------|--------------|------------|---------------------|
| 1 | `tp-001` | `...0001` | 4 | `asset_analysis` | `gemini` | completed | 2,340 | 0.00 | `{"face_detected":true,"frontal":true,"resolution":"1024x1024","suitability":0.94}` |
| 2 | `tp-002` | `...0001` | 11 | `hook_query` | `internal` | completed | 45 | 0.00 | `{"industry":"skincare","hooks_returned":5,"top_hook":"stop_scrolling"}` |
| 3 | `tp-003` | `...0001` | 1 | `script_enhancement` | `gemini` | completed | 3,870 | 0.00 | `{"original_chars":186,"enhanced_chars":224,"duration_est_s":32}` |
| 4 | `tp-004` | `...0001` | 2 | `plan_review` | `internal` | completed | 127,000 | 0.00 | `{"wait_type":"user_approval","revision_count":0}` |
| 5 | `tp-005` | `...0001` | 20 | `voice_tts` | `elevenlabs` | completed | 4,210 | 0.03 | `{"voice_id":"el_voice_abc123","mode":"clone","chars":224,"duration_s":32}` |
| 6 | `tp-006` | `...0001` | 16 | `motion_variant_gen` | `kie_ai` | completed | 45,200 | 0.12 | `{"variant_index":1,"prompt":"idle_breathing"}` |
| 7 | `tp-007` | `...0001` | 16 | `motion_variant_gen` | `kie_ai` | completed | 47,800 | 0.12 | `{"variant_index":2,"prompt":"micro_head_movement"}` |
| 8 | `tp-008` | `...0001` | 16 | `motion_variant_gen` | `kie_ai` | completed | 44,100 | 0.12 | `{"variant_index":3,"prompt":"expression_evolution"}` |
| 9 | `tp-009` | `...0001` | 16 | `motion_variant_score` | `internal` | completed | 120 | 0.00 | `{"selected_variant":2,"naturalness":0.91,"gesture_density":0.85,"sync_alignment":0.88}` |
| 10 | `tp-010` | `...0001` | 7 | `music_generation` | `kie_ai` | completed | 38,600 | 0.07 | `{"model":"suno-v4","mood":"upbeat_corporate","duration_s":32}` |
| 11 | `tp-011` | `...0001` | 9 | `lipsync_generation` | `fal_ai` | completed | 78,400 | 0.35 | `{"model":"sync-lipsync","tier":"production","video_duration_s":32}` |
| 12 | `tp-012` | `...0001` | 8 | `assembly` | `fal_ai` | completed | 12,300 | 0.02 | `{"layers":["voice","music","captions"],"output_format":"mp4","aspect":"9:16"}` |
| 13 | `tp-013` | `...0001` | 17 | `postprod_subtitles` | `byteplus` | completed | 8,200 | 0.03 | `{"subtitle_format":"burn_in","word_count":42}` |
| 14 | `tp-014` | `...0001` | 17 | `postprod_enhancement` | `byteplus` | completed | 15,400 | 0.05 | `{"operations":["denoise","color_grade","loudness_norm"]}` |
| 15 | `tp-015` | `...0001` | 17 | `postprod_watermark` | `byteplus` | completed | 3,100 | 0.02 | `{"type":"review_watermark","opacity":0.3}` |
| 16 | `tp-016` | `...0001` | 17 | `postprod_thumbnail` | `byteplus` | completed | 2,800 | 0.02 | `{"source":"frame_extraction","brand_overlay":true}` |
| 17 | `tp-017` | `...0001` | 17 | `postprod_export` | `byteplus` | completed | 6,400 | 0.03 | `{"presets":["instagram_reels","tiktok","youtube_shorts"]}` |

**Total touchpoint rows**: 17  
**Total cost across touchpoints**: $0.98 (observability only — NOT used for billing)

---

## Layer 1: Event Bus (Correlation & Replay Chain)

These are the `event_bus` rows. They trace the **cause → effect** chain and group everything under one `correlation_id`.

```
correlation_id: "corr-f2-0001"
(All events from Sarah clicking "Generate Spokesperson Video")
```

| seq | `event_id` | `parent_event_id` | `module_id` | `event_type` | `stage` | `status` | `duration_ms` | `touchpoint_id` | `context` |
|-----|------------|-------------------|-------------|--------------|---------|----------|---------------|-----------------|-----------|
| 1 | `eb-001` | — | — | `intake.brief_received` | brief_intake | completed | 50 | — | `{"family":"F2","voice_mode":"clone"}` |
| 2 | `eb-002` | `eb-001` | 4 | `analysis.started` | image_analysis | started | — | — | `{}` |
| 3 | `eb-003` | `eb-002` | 4 | `analysis.completed` | image_analysis | completed | 2,340 | `tp-001` | `{"suitability":0.94}` |
| 4 | `eb-004` | `eb-003` | 11 | `planning.hook_queried` | script_enhancement | completed | 45 | `tp-002` | `{"hooks_returned":5}` |
| 5 | `eb-005` | `eb-004` | 1 | `planning.plan_generated` | script_enhancement | completed | 3,870 | `tp-003` | `{"duration_est_s":32}` |
| 6 | `eb-006` | `eb-005` | 19 | `review.submitted` | plan_review | completed | 200 | — | `{"packet_type":"script_preview"}` |
| 7 | `eb-007` | `eb-006` | 2 | `review.approved` | plan_review | completed | 127,000 | `tp-004` | `{"approval_decision":"approved"}` |
| 8 | `eb-008` | `eb-007` | 20 | `voice.clone_tts_requested` | voice_generation | started | — | — | `{"voice_id":"el_voice_abc123"}` |
| 9 | `eb-009` | `eb-008` | 20 | `voice.tts_completed` | voice_generation | completed | 4,210 | `tp-005` | `{"duration_s":32}` |
| 10 | `eb-010` | `eb-007` | 16 | `generation.started` | base_video | started | — | — | `{"variant_count":3}` |
| 11 | `eb-011` | `eb-010` | 16 | `generation.completed` | base_video | completed | 47,800 | `tp-006,007,008` | `{"selected_variant":2}` |
| 12 | `eb-012` | `eb-007` | 7 | `generation.started` | music | started | — | — | `{"mood":"upbeat_corporate"}` |
| 13 | `eb-013` | `eb-012` | 7 | `generation.completed` | music | completed | 38,600 | `tp-010` | `{}` |
| 14 | `eb-014` | `eb-009,eb-011` | 9 | `routing.provider_selected` | lip_sync | completed | 30 | — | `{"provider":"fal_ai","model":"sync-lipsync","tier":"production"}` |
| 15 | `eb-015` | `eb-014` | 9 | `generation.started` | lip_sync | started | — | — | `{}` |
| 16 | `eb-016` | `eb-015` | 9 | `generation.completed` | lip_sync | completed | 78,400 | `tp-011` | `{}` |
| 17 | `eb-017` | `eb-016,eb-013` | 8 | `assembly.started` | assembly | started | — | — | `{"layers":3}` |
| 18 | `eb-018` | `eb-017` | 8 | `assembly.completed` | assembly | completed | 12,300 | `tp-012` | `{}` |
| 19 | `eb-019` | `eb-018` | 17 | `postprod.subtitles_added` | post_production | completed | 8,200 | `tp-013` | `{}` |
| 20 | `eb-020` | `eb-019` | 17 | `postprod.enhanced` | post_production | completed | 15,400 | `tp-014` | `{}` |
| 21 | `eb-021` | `eb-020` | 17 | `postprod.watermark_applied` | post_production | completed | 3,100 | `tp-015` | `{"version":"review"}` |
| 22 | `eb-022` | `eb-021` | 17 | `postprod.exported` | post_production | completed | 6,400 | `tp-017` | `{"preset_count":3}` |
| 23 | `eb-023` | `eb-022` | 17 | `delivery.review_copy_ready` | delivery | completed | 100 | — | `{}` |

**Total event_bus rows**: 23

### Cause-Effect Chain Visualization

```
eb-001 intake.brief_received
  └─ eb-002 analysis.started
       └─ eb-003 analysis.completed
            └─ eb-004 planning.hook_queried
                 └─ eb-005 planning.plan_generated
                      └─ eb-006 review.submitted
                           └─ eb-007 review.approved ──────────────────────┐
                                ├─ eb-008 voice.clone_tts_requested        │  (3 parallel lanes)
                                │    └─ eb-009 voice.tts_completed ────┐   │
                                ├─ eb-010 generation.started (video)   │   │
                                │    └─ eb-011 generation.completed ───┤   │
                                └─ eb-012 generation.started (music)   │   │
                                     └─ eb-013 generation.completed ───┤   │
                                                                       │   │
                                eb-014 routing.provider_selected ◄─────┘   │
                                  └─ eb-015 generation.started (lipsync)   │
                                       └─ eb-016 generation.completed      │
                                            │                              │
                                eb-017 assembly.started ◄──────────────────┘
                                  └─ eb-018 assembly.completed
                                       └─ eb-019 postprod.subtitles_added
                                            └─ eb-020 postprod.enhanced
                                                 └─ eb-021 postprod.watermark_applied
                                                      └─ eb-022 postprod.exported
                                                           └─ eb-023 delivery.review_copy_ready
```

### Replay Query

```sql
-- Full job replay: every event in execution order
SELECT sequence_num, event_type, module_id, status, duration_ms, context
FROM event_bus
WHERE job_id = 'a1b2c3d4-0001-4000-a000-000000000001'
ORDER BY sequence_num;
-- Returns 23 rows in ~5ms
```

---

## Layer 2: Metrics Rollup Contributions

This single F2 job contributes to four materialized views at their next refresh cycle.

### 2a. `mv_provider_health` (next refresh: ≤5 min)

This job adds data points for 4 providers:

| `provider_id` | `hour` | Contribution |
|----------------|--------|-------------|
| `gemini` | 2026-03-31 14:00 | +1 success, latency 2,340ms, cost $0.00 |
| `elevenlabs` | 2026-03-31 14:00 | +1 success, latency 4,210ms, cost $0.03 |
| `kie_ai` | 2026-03-31 14:00 | +4 successes (3 variants + 1 music), avg latency 43,925ms, cost $0.43 |
| `fal_ai` | 2026-03-31 14:00 | +2 successes (lipsync + assembly), avg latency 45,350ms, cost $0.37 |
| `byteplus` | 2026-03-31 14:00 | +4 successes (subtitle + enhance + watermark + thumbnail), avg latency 7,375ms, cost $0.12 |

### 2b. `mv_module_performance` (next refresh: ≤15 min)

| `module_id` | `day` | Contribution |
|-------------|-------|-------------|
| 4 (Asset Analyzer) | 2026-03-31 | +1 execution, 2,340ms, $0.00 |
| 11 (Hook Library) | 2026-03-31 | +1 execution, 45ms, $0.00 |
| 1 (Creative Director) | 2026-03-31 | +1 execution, 3,870ms, $0.00 |
| 20 (Voice Mgmt) | 2026-03-31 | +1 execution, 4,210ms, $0.03 |
| 16 (Motion Variant) | 2026-03-31 | +4 executions (3 gen + 1 score), avg 34,305ms, $0.36 |
| 7 (Music Engine) | 2026-03-31 | +1 execution, 38,600ms, $0.07 |
| 9 (Provider Routing) | 2026-03-31 | +1 execution, 78,430ms, $0.35 |
| 8 (Assembly) | 2026-03-31 | +1 execution, 12,300ms, $0.02 |
| 17 (Post-Production) | 2026-03-31 | +4 executions, avg 7,475ms, $0.12 |

### 2c. `mv_brand_analytics` (next refresh: ≤30 min)

| `brand_id` | `week` | `family` | Contribution |
|------------|--------|----------|-------------|
| `b1b2...0002` | 2026-W14 | F2 | +1 job, +$0.57 spend (from `job_stages`), turnaround 252s, 0 revisions, 1 approval |

### 2d. `mv_family_throughput` (next refresh: ≤15 min)

| `family` | `day` | Contribution |
|----------|-------|-------------|
| F2 | 2026-03-31 | +1 started, +1 delivered, pipeline_seconds 252 |

---

## Layer 3: Audit Trail (Immutable Records)

Only **decision points** that affect money, access, or content delivery are logged. This job produces exactly **4 audit entries**.

| # | `action` | `actor_type` | `actor_email` | `resource_type` | `reason` | `change_summary` | `correlation_id` |
|---|----------|-------------|---------------|-----------------|----------|-------------------|-------------------|
| 1 | `review.approved` | user | sarah@skincarebrand.com | review_packet | "Client approved enhanced script and voice preview" | `{"field":"status","before":"pending_review","after":"approved"}` | `corr-f2-0001` |
| 2 | `billing.job_charged` | system | — | job | "Auto-charged on job completion" | `{"total_cost_usd":0.57,"tier":"production","family":"F2"}` | `corr-f2-0001` |
| 3 | `delivery.review_copy_ready` | system | — | artifact | "Watermarked review copy generated for client approval" | `{"watermark":true,"expiry_days":7}` | `corr-f2-0001` |
| 4 | `delivery.production_unlocked` | user | sarah@skincarebrand.com | artifact | "Client approved final review copy" | `{"field":"access","before":"watermarked","after":"production_unlocked"}` | `corr-f2-0001` |

### Audit Query: "Show me everything Sarah approved"

```sql
SELECT action, reason, change_summary, created_at
FROM audit_log
WHERE actor_email = 'sarah@skincarebrand.com'
  AND action LIKE 'review.%' OR action LIKE 'delivery.%'
ORDER BY created_at;
```

---

## Billing Cross-Reference

The billing source of truth is `job_stages.cost` — **NOT** touchpoint_events or event_bus.

| `job_stages` entry | `stage` | `cost` (JSONB) |
|--------------------|---------|----------------|
| `js-001` | voice_generation | `{"cost_usd": 0.03, "voice_total": 0.03}` |
| `js-002` | base_video | `{"cost_usd": 0.36, "variant_count": 3}` |
| `js-003` | music | `{"cost_usd": 0.07}` |
| `js-004` | lip_sync | `{"cost_usd": 0.35, "model": "sync-lipsync"}` |
| `js-005` | assembly | `{"cost_usd": 0.02}` |
| `js-006` | post_production | `{"cost_usd": 0.12, "breakdown": {"subtitles": 0.03, "enhancement": 0.05, "watermark": 0.02, "thumbnail": 0.02}}` |
| `js-007` | export | `{"cost_usd": 0.03, "presets": 3}` |

**Billing total**: $0.98 (sum of `job_stages.cost.cost_usd`)  
**Touchpoint total**: $0.98 (observability mirror — matches but NEVER used for billing)

---

## Summary: What Each Layer Tells You

| Question | Layer | Query |
|----------|-------|-------|
| "What providers were called?" | Layer 0 (Touchpoint) | `WHERE job_id = X` |
| "What was the execution order?" | Layer 1 (Event Bus) | `WHERE job_id = X ORDER BY sequence_num` |
| "Why did it pick Sync Labs over LatentSync?" | Layer 1 (Event Bus) | `WHERE event_type = 'routing.provider_selected'` → context shows `tier: production` |
| "How long did lip-sync take?" | Layer 0 (Touchpoint) | `WHERE touchpoint_id = 'tp-011'` → `latency_ms: 78,400` |
| "Is Kie AI healthy right now?" | Layer 2 (Metrics) | `SELECT * FROM mv_provider_health WHERE provider_id = 'kie_ai'` |
| "How much did this brand spend this week?" | Layer 2 (Metrics) | `SELECT * FROM mv_brand_analytics WHERE brand_id = X` |
| "Who approved this job?" | Layer 3 (Audit) | `WHERE job_id = X AND action = 'review.approved'` |
| "What was the cost?" | Billing (`job_stages`) | `WHERE job_id = X` → sum `cost_usd` |
| "Show me the full chain from click to delivery" | Layer 1 (Event Bus) | `WHERE correlation_id = 'corr-f2-0001' ORDER BY sequence_num` |

---

## Data Volume Per Job

| Layer | Rows | Avg Row Size | Total |
|-------|------|-------------|-------|
| Layer 0 (Touchpoint) | 17 | ~200 bytes | ~3.4 KB |
| Layer 1 (Event Bus) | 23 | ~180 bytes | ~4.1 KB |
| Layer 2 (Metrics) | — | Aggregated | 0 (rollup, not per-job) |
| Layer 3 (Audit) | 4 | ~300 bytes | ~1.2 KB |
| **Total per job** | **44 rows** | | **~8.7 KB** |

At 10,000 jobs/month: ~87 MB raw observability data. Well within PostgreSQL comfort zone.
