# Brandflow SQL Schema — Complete Database Reference

> **Status**: Design reference — Supabase PostgreSQL  
> **Last updated**: 2026-04-03  
> **Purpose**: Single source of truth for all database tables  
> **Backend**: Supabase (PostgreSQL) — the only persistence backend

---

## Core Tables

### jobs

The central execution record. Every content generation request creates a job.

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  initiative_id UUID,
  plan_id UUID,
  family TEXT NOT NULL, -- 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'planning' | 'generating' | 'assembling' | 'post_production' | 'review' | 'approved' | 'rejected' | 'revision_requested' | 'delivered' | 'published' | 'failed' | 'cancelled'
  brief JSONB NOT NULL DEFAULT '{}', -- user-provided intent
  generation_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID -- FK → auth.users
);

CREATE INDEX idx_jobs_brand ON jobs(brand_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_family ON jobs(family);
CREATE INDEX idx_jobs_created ON jobs(created_at);
```

### job_stages

**Billing source of truth.** Every stage logs cost as a JSONB object.

```sql
CREATE TABLE job_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) NOT NULL,
  stage TEXT NOT NULL, -- 'creative_direction' | 'asset_analysis' | 'planning' | 'generation' | 'assembly' | 'post_production' | 'review' | 'delivery'
  module_id INTEGER, -- 1-27, which engine module handled this
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying'
  input_params JSONB DEFAULT '{}',
  output_refs JSONB DEFAULT '{}', -- references to artifacts, not full payloads
  cost JSONB DEFAULT '{}', -- { "provider": "string", "model": "string", "cost_usd": number, "tier": "string" }
  provider_used TEXT,
  latency_ms INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_job_stages_job ON job_stages(job_id);
CREATE INDEX idx_job_stages_stage ON job_stages(stage);
```

### artifacts

All generated assets (videos, images, audio, thumbnails).

```sql
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) NOT NULL,
  family TEXT NOT NULL,
  type TEXT NOT NULL, -- 'video' | 'image' | 'audio' | 'text' | 'thumbnail'
  storage_url TEXT NOT NULL, -- Supabase Storage URL
  storage_path TEXT NOT NULL, -- bucket path
  file_size_kb INTEGER,
  metadata JSONB DEFAULT '{}', -- { "duration_s": number, "aspect_ratio": "string", "resolution": "string", "format": "string" }
  version INTEGER DEFAULT 1,
  is_review_copy BOOLEAN DEFAULT false,
  is_production BOOLEAN DEFAULT false,
  watermarked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_artifacts_job ON artifacts(job_id);
CREATE INDEX idx_artifacts_family ON artifacts(family);
CREATE INDEX idx_artifacts_type ON artifacts(type);
```

---

## Brand & Identity Tables

### brand_profiles

Brand identity, voice, and visual configuration.

```sql
CREATE TABLE brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  name TEXT NOT NULL,
  industry TEXT,
  description TEXT,
  website_url TEXT,
  logo_url TEXT,
  colors JSONB DEFAULT '{}', -- { "primary": "#hex", "secondary": "#hex", "accent": "#hex" }
  fonts JSONB DEFAULT '{}', -- { "heading": "string", "body": "string" }
  voice_profile JSONB DEFAULT '{}', -- Brand Voice DNA output: tone, vocabulary, patterns, emoji, formatting
  visual_style JSONB DEFAULT '{}', -- preferred lighting, color palette, photography style
  competitor_handles TEXT[] DEFAULT '{}',
  target_audience TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_brand_profiles_workspace ON brand_profiles(workspace_id);
```

---

## Intelligence Tables

### hooks

Performance-ranked hook patterns used by Hook Library (#11).

```sql
CREATE TABLE hooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style TEXT NOT NULL, -- 'question' | 'statistic' | 'bold_claim' | 'story' | 'challenge' | 'before_after' | 'myth_bust' | 'social_proof'
  text TEXT NOT NULL,
  industry TEXT,
  platform TEXT,
  format TEXT, -- 'reel' | 'post' | 'carousel' | 'video'
  performance_score NUMERIC DEFAULT 50,
  usage_count INTEGER DEFAULT 0,
  source TEXT, -- 'firecrawl_scrape' | 'competitor_intel' | 'manual' | 'performance_learned'
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_hooks_style ON hooks(style);
CREATE INDEX idx_hooks_industry ON hooks(industry);
CREATE INDEX idx_hooks_platform ON hooks(platform);
CREATE INDEX idx_hooks_score ON hooks(performance_score DESC);
```

### voice_generations

Per-TTS/dub/clone call tracking for Voice Management Engine (#20).

```sql
CREATE TABLE voice_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) NOT NULL,
  voice_preset_id UUID,
  mode TEXT NOT NULL, -- 'tts' | 'clone' | 'upload' | 'dub'
  provider TEXT NOT NULL, -- 'elevenlabs' | 'byteplus'
  model TEXT,
  script_text TEXT,
  audio_url TEXT,
  duration_s NUMERIC,
  language TEXT DEFAULT 'en',
  quality_score NUMERIC, -- 0-100
  cost_usd NUMERIC,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voice_gen_job ON voice_generations(job_id);
CREATE INDEX idx_voice_gen_mode ON voice_generations(mode);
```

---

## Performance & Feedback Tables

### performance_signals

Post-publish engagement metrics collected at T+24h, T+48h, T+7d, T+30d.

```sql
CREATE TABLE performance_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL,
  initiative_id UUID,
  job_id UUID,
  family TEXT NOT NULL,
  platform TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ DEFAULT now(),
  collection_window TEXT NOT NULL, -- '24h' | '48h' | '7d' | '30d'
  metrics JSONB NOT NULL DEFAULT '{}', -- impressions, reach, likes, comments, shares, saves, clicks, watch_time_s, completion_rate, ctr
  scores JSONB NOT NULL DEFAULT '{}', -- engagement_score, hook_score, conversion_signal, retention_signal, variant_rank
  context JSONB NOT NULL DEFAULT '{}', -- hook_style, hook_id, template_id, provider_used, generation_tier, pillar_id
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_perf_signals_asset ON performance_signals(asset_id);
CREATE INDEX idx_perf_signals_family_platform ON performance_signals(family, platform);
CREATE INDEX idx_perf_signals_job ON performance_signals(job_id);
```

### feedback_signals

Derived optimization signals emitted by Performance Feedback Engine (#22).

```sql
CREATE TABLE feedback_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type TEXT NOT NULL, -- 'hook_weight_update' | 'template_priority_update' | 'family_routing_adjustment' | 'strategy_rebalance' | 'preference_update' | 'approval_pattern'
  target TEXT NOT NULL, -- 'hook_library' | 'template_library' | 'provider_routing' | 'strategy_engine' | 'decision_engine' | 'brand_memory'
  payload JSONB NOT NULL,
  confidence NUMERIC NOT NULL,
  sample_size INTEGER NOT NULL,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_feedback_signals_type ON feedback_signals(signal_type);
CREATE INDEX idx_feedback_signals_target ON feedback_signals(target);
```

---

## Memory Tables

### brand_memory

Long-term brand-specific intelligence aggregated by memory type.

```sql
CREATE TABLE brand_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  memory_type TEXT NOT NULL, -- 'approval' | 'preference' | 'do_not_use' | 'creative_history'
  data JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC DEFAULT 0.5,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (brand_id, memory_type)
);

CREATE INDEX idx_brand_memory_brand ON brand_memory(brand_id);
```

### asset_memory

Tracks which generated assets are reusable for future content.

```sql
CREATE TABLE asset_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  artifact_id UUID NOT NULL,
  family TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- 'video' | 'image' | 'audio'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'do_not_reuse' | 'archived'
  engagement_score NUMERIC,
  reuse_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_asset_memory_brand ON asset_memory(brand_id);
CREATE INDEX idx_asset_memory_reuse ON asset_memory(brand_id, status, engagement_score DESC);
```

### creative_history

Full generation history per brand for trend analysis.

```sql
CREATE TABLE creative_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  job_id UUID NOT NULL,
  family TEXT NOT NULL,
  angle TEXT,
  hook_style TEXT,
  platform TEXT,
  outcome TEXT NOT NULL, -- 'approved' | 'rejected' | 'revised'
  engagement_score NUMERIC,
  revision_count INTEGER DEFAULT 0,
  revision_reasons TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_creative_history_brand ON creative_history(brand_id, created_at DESC);
CREATE INDEX idx_creative_history_outcome ON creative_history(brand_id, outcome);
```

### user_preference_memory

Learned preferences from approval/rejection patterns.

```sql
CREATE TABLE user_preference_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  preference_type TEXT NOT NULL, -- 'format' | 'visual_style' | 'voice' | 'platform' | 'hook_style'
  preferred JSONB DEFAULT '[]',
  avoided JSONB DEFAULT '[]',
  confidence NUMERIC DEFAULT 0.5,
  sample_size INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (brand_id, preference_type)
);

CREATE INDEX idx_user_pref_brand ON user_preference_memory(brand_id);
```

### do_not_use_registry

Explicit patterns flagged by users or auto-detected from rejections.

```sql
CREATE TABLE do_not_use_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  pattern_type TEXT NOT NULL, -- 'hook_style' | 'visual_element' | 'phrase' | 'angle' | 'color' | 'format'
  pattern_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL, -- 'manual_flag' | 'rejection_pattern' | 'revision_pattern' | 'compliance'
  added_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dnu_brand ON do_not_use_registry(brand_id);
```

---

## Research & Intelligence Tables

### intelligence_briefs

Research outputs from the Research & Competitor Intelligence Engine (#25).

```sql
CREATE TABLE intelligence_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  initiative_id UUID,
  research_mode TEXT NOT NULL, -- 'cached' | 'fresh'
  brief JSONB NOT NULL,
  confidence_score NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_intel_briefs_brand ON intelligence_briefs(brand_id);
CREATE INDEX idx_intel_briefs_initiative ON intelligence_briefs(initiative_id);
```

### category_intelligence_cache

Cached vertical/category intelligence for cost and latency reduction.

```sql
CREATE TABLE category_intelligence_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical TEXT NOT NULL,
  platform TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'global',
  category_norms JSONB NOT NULL DEFAULT '{}',
  platform_heuristics JSONB NOT NULL DEFAULT '{}',
  source_count INTEGER NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  collected_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (vertical, platform, region)
);

CREATE INDEX idx_cat_intel_lookup ON category_intelligence_cache(vertical, platform, region);
CREATE INDEX idx_cat_intel_freshness ON category_intelligence_cache(expires_at);
```

---

## Trust & Decision Tables

### decision_traces

Decision rationale records from the Trust & Explainability Engine.

```sql
CREATE TABLE decision_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  initiative_id UUID,
  brand_id UUID NOT NULL,
  strategy_object_id UUID,
  decision_summary TEXT NOT NULL,
  signals_used JSONB NOT NULL DEFAULT '[]',
  rationale JSONB NOT NULL DEFAULT '{}',
  rejected_alternatives JSONB NOT NULL DEFAULT '[]',
  assumptions JSONB NOT NULL DEFAULT '[]',
  confidence JSONB NOT NULL DEFAULT '{}',
  next_test_recommendation JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_decision_traces_job ON decision_traces(job_id);
CREATE INDEX idx_decision_traces_brand ON decision_traces(brand_id);
```

---

## Approval Tables

### review_packets

Structured approval artifacts from Review Packet Engine (#19).

```sql
CREATE TABLE review_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) NOT NULL,
  family TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending_review', -- 'pending_review' | 'approved' | 'rejected' | 'revision_requested' | 'expired'
  preview_assets JSONB NOT NULL DEFAULT '[]',
  caption_options JSONB DEFAULT '[]',
  language_versions JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  explainability JSONB DEFAULT '{}', -- decision_trace_id, strategy_angle, why_chosen, confidence, alternatives
  review_config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE (job_id, version)
);

CREATE INDEX idx_review_packets_job ON review_packets(job_id);
CREATE INDEX idx_review_packets_status ON review_packets(status);
```

### approval_policies

Configurable approval chains per brand.

```sql
CREATE TABLE approval_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  name TEXT NOT NULL,
  rules JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_approval_policies_brand ON approval_policies(brand_id);
```

### approval_chain_entries

Per-step approval tracking within a review packet.

```sql
CREATE TABLE approval_chain_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID REFERENCES review_packets(id) NOT NULL,
  step INTEGER NOT NULL,
  role TEXT NOT NULL,
  user_id UUID,
  decision TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'skipped'
  decided_at TIMESTAMPTZ,
  auto_approved BOOLEAN DEFAULT false,
  escalated_from_step INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (packet_id, step)
);

CREATE INDEX idx_approval_chain_packet ON approval_chain_entries(packet_id);
```

### review_actions

Individual review decisions on packets.

```sql
CREATE TABLE review_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID REFERENCES review_packets(id) NOT NULL,
  reviewer_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'approved' | 'rejected' | 'revision_requested'
  feedback TEXT,
  revision_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### review_notes

Operator and system notes attached to review packets.

```sql
CREATE TABLE review_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID REFERENCES review_packets(id) NOT NULL,
  author TEXT NOT NULL, -- 'system' or user_id
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Publishing Tables

### social_accounts

Connected social media accounts per brand.

```sql
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  platform TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  platform_username TEXT,
  access_token TEXT NOT NULL, -- encrypted at rest
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'connected',
  auto_publish BOOLEAN DEFAULT false,
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_published_at TIMESTAMPTZ,
  UNIQUE (brand_id, platform, platform_user_id)
);

CREATE INDEX idx_social_accounts_brand ON social_accounts(brand_id);
```

### publish_records

Publication tracking per asset per platform.

```sql
CREATE TABLE publish_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL,
  job_id UUID,
  brand_id UUID NOT NULL,
  social_account_id UUID REFERENCES social_accounts(id) NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued' | 'scheduled' | 'publishing' | 'published' | 'publish_failed' | 'retry_queued' | 'permanently_failed'
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_post_id TEXT,
  platform_post_url TEXT,
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_publish_records_brand ON publish_records(brand_id);
CREATE INDEX idx_publish_records_status ON publish_records(status);
CREATE INDEX idx_publish_records_scheduled ON publish_records(scheduled_at) WHERE status = 'scheduled';
```

---

## Observability Tables

### touchpoint_events (Layer 0)

See `PIPELINE_CONTRACTS.md` for full specification.

```sql
CREATE TABLE touchpoint_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  stage TEXT NOT NULL,
  module_id INTEGER NOT NULL, -- 1-27
  provider_id TEXT,
  action TEXT NOT NULL,
  tier TEXT,
  status TEXT NOT NULL DEFAULT 'started',
  cost_usd NUMERIC,
  latency_ms INTEGER,
  error_code TEXT,
  metadata JSONB DEFAULT '{}', -- max 1KB
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_touchpoints_job ON touchpoint_events(job_id);
CREATE INDEX idx_touchpoints_module ON touchpoint_events(module_id, status);
CREATE INDEX idx_touchpoints_provider ON touchpoint_events(provider_id, status);
CREATE INDEX idx_touchpoints_created ON touchpoint_events(created_at);
```

### event_bus (Layer 1)

See `OBSERVABILITY_CONTRACTS.md` for full specification.

```sql
CREATE TABLE event_bus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id UUID NOT NULL,
  parent_event_id UUID,
  sequence_num INTEGER NOT NULL,
  job_id UUID NOT NULL,
  brand_id UUID,
  module_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms INTEGER,
  touchpoint_id UUID,
  artifact_id UUID,
  stage_id UUID,
  context JSONB DEFAULT '{}', -- max 512 bytes
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_eventbus_job_seq ON event_bus(job_id, sequence_num);
CREATE INDEX idx_eventbus_correlation ON event_bus(correlation_id, sequence_num);
CREATE INDEX idx_eventbus_parent ON event_bus(parent_event_id);
CREATE INDEX idx_eventbus_type ON event_bus(event_type, created_at);
CREATE INDEX idx_eventbus_brand ON event_bus(brand_id, created_at);
```

### audit_log (Layer 3)

See `OBSERVABILITY_CONTRACTS.md` for full specification including immutability triggers.

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_type TEXT NOT NULL,
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  reason TEXT,
  change_summary JSONB DEFAULT '{}',
  job_id UUID,
  correlation_id UUID,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id, created_at);
CREATE INDEX idx_audit_actor ON audit_log(actor_id, created_at);
CREATE INDEX idx_audit_job ON audit_log(job_id, created_at);
CREATE INDEX idx_audit_action ON audit_log(action, created_at);
CREATE INDEX idx_audit_actor_email ON audit_log(actor_email);
```

---

## Infrastructure Tables

### provider_status

Provider health tracking for routing decisions.

```sql
CREATE TABLE provider_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'healthy', -- 'healthy' | 'degraded' | 'down'
  last_check TIMESTAMPTZ DEFAULT now(),
  failure_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  p50_latency_ms INTEGER,
  p95_latency_ms INTEGER,
  p99_latency_ms INTEGER,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### plan_objects

See `PLAN_OBJECT_SCHEMA.md` for full specification.

```sql
CREATE TABLE plan_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL,
  brand_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'queued',
  intent JSONB NOT NULL,
  routing JSONB NOT NULL,
  generation_config JSONB NOT NULL DEFAULT '{}',
  variant_config JSONB NOT NULL DEFAULT '{}',
  cost_estimate JSONB DEFAULT '{}',
  budget_check JSONB DEFAULT '{}',
  capacity_check JSONB DEFAULT '{}',
  risk_assessment JSONB DEFAULT '{}',
  dependencies JSONB DEFAULT '[]',
  latency_tier JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_plan_objects_brand ON plan_objects(brand_id);
CREATE INDEX idx_plan_objects_status ON plan_objects(status);
CREATE INDEX idx_plan_objects_initiative ON plan_objects(initiative_id);
```

### plan_versions, plan_dependencies, plan_templates, forecast_runs

See `PLAN_OBJECT_SCHEMA.md` and `engines/STRATEGY_ENGINE.md` for specifications.

```sql
CREATE TABLE plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plan_objects(id) NOT NULL,
  version INTEGER NOT NULL,
  changed_fields JSONB NOT NULL DEFAULT '[]',
  previous_values JSONB NOT NULL DEFAULT '{}',
  changed_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (plan_id, version)
);

CREATE TABLE plan_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plan_objects(id) NOT NULL,
  depends_on_plan_id UUID REFERENCES plan_objects(id) NOT NULL,
  dependency_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  satisfied_at TIMESTAMPTZ,
  UNIQUE (plan_id, depends_on_plan_id)
);

CREATE TABLE plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vertical TEXT,
  family_mix JSONB DEFAULT '{}',
  schedule_pattern JSONB DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE forecast_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  scenario JSONB NOT NULL,
  estimated_cost JSONB DEFAULT '{}',
  capacity_risk JSONB DEFAULT '{}',
  sla_risk JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_plan_versions_plan ON plan_versions(plan_id);
CREATE INDEX idx_plan_dependencies_plan ON plan_dependencies(plan_id);
CREATE INDEX idx_plan_dependencies_upstream ON plan_dependencies(depends_on_plan_id);
CREATE INDEX idx_forecast_runs_brand ON forecast_runs(brand_id);
```

---

## Materialized Views

See `OBSERVABILITY_CONTRACTS.md` for full specifications including refresh schedules.

- `mv_provider_health` — 5 min refresh, provider uptime/latency/cost
- `mv_module_performance` — 15 min refresh, module execution stats
- `mv_brand_analytics` — 30 min refresh, per-brand weekly metrics
- `mv_family_throughput` — 15 min refresh, per-family daily throughput

---

## Table Count Summary

| Category | Tables | Count |
|----------|--------|-------|
| Core | jobs, job_stages, artifacts | 3 |
| Brand & Identity | brand_profiles | 1 |
| Intelligence | hooks, voice_generations | 2 |
| Performance & Feedback | performance_signals, feedback_signals | 2 |
| Memory | brand_memory, asset_memory, creative_history, user_preference_memory, do_not_use_registry | 5 |
| Research & Intelligence | intelligence_briefs, category_intelligence_cache | 2 |
| Trust & Decision | decision_traces | 1 |
| Approval | review_packets, approval_policies, approval_chain_entries, review_actions, review_notes | 5 |
| Publishing | social_accounts, publish_records | 2 |
| Observability | touchpoint_events, event_bus, audit_log | 3 |
| Infrastructure | provider_status, plan_objects, plan_versions, plan_dependencies, plan_templates, forecast_runs | 6 |
| **Total** | | **32** |
