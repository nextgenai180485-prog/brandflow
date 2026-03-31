# Observability Contracts — Enterprise-Grade Tracking & Analytics

> **Status**: Design reference — extends `PIPELINE_CONTRACTS.md` touchpoint schema  
> **Last updated**: 2026-03-31  
> **Layers**: 3 (Event Bus → Metrics Aggregation → Audit Trail)

---

## Architecture Overview

Brandflow observability is built in **3 layers**, each serving a distinct purpose. All layers build on top of the `touchpoint_events` table defined in `PIPELINE_CONTRACTS.md`.

```
┌─────────────────────────────────────────────────────────┐
│  Layer 3: AUDIT TRAIL (Compliance)                      │
│  Immutable. Who did what, when, why. 7-year retention.  │
├─────────────────────────────────────────────────────────┤
│  Layer 2: METRICS AGGREGATION (Dashboards)              │
│  Pre-computed rollups. Fast reads. Permanent retention.  │
├─────────────────────────────────────────────────────────┤
│  Layer 1: EVENT BUS (Correlation & Replay)              │
│  Structured envelope. Traces cause→effect chains.       │
├─────────────────────────────────────────────────────────┤
│  Layer 0: TOUCHPOINT EVENTS (Raw Signals)               │
│  Already exists — see PIPELINE_CONTRACTS.md             │
└─────────────────────────────────────────────────────────┘
```

### Storage Temperature

| Layer | Storage | Retention |
|-------|---------|-----------|
| Layer 0 — Touchpoint Events | Hot (PostgreSQL) | 90 days full → aggregate → archive |
| Layer 1 — Event Bus | Hot (PostgreSQL) | 90 days full → 365 days compressed → purge |
| Layer 2 — Metrics Rollups | Warm (PostgreSQL materialized views) | Permanent |
| Layer 3 — Audit Trail | Cold-safe (append-only table) | 7 years minimum |

---

## Layer 1: Event Bus — Correlation & Replay

### Purpose

Enable **full job replay** ("show me exactly what happened, in order, with timing") and **cross-module tracing** ("this approval triggered that generation which caused that export").

### Design Principle

Every module emits events through a **standardized envelope**. Events are linked via `correlation_id` (groups all events from a single user action) and `parent_event_id` (cause → effect chains).

### Schema

```sql
CREATE TABLE event_bus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Correlation
  correlation_id UUID NOT NULL,       -- Groups all events from one user action
  parent_event_id UUID,               -- FK → event_bus.id (cause → effect chain)
  sequence_num INTEGER NOT NULL,      -- Order within correlation group
  
  -- Identity
  job_id UUID NOT NULL,               -- FK → jobs
  brand_id UUID,                      -- FK → brands (denormalized for query speed)
  module_id INTEGER NOT NULL,         -- 1-22
  
  -- Event Classification
  event_type TEXT NOT NULL,           -- Structured: "{domain}.{action}"
  stage TEXT NOT NULL,                -- Pipeline stage
  
  -- Outcome
  status TEXT NOT NULL,               -- "started" | "completed" | "failed" | "skipped" | "retried"
  duration_ms INTEGER,               -- Time from started → completed for this event
  
  -- References (NO payloads)
  touchpoint_id UUID,                -- FK → touchpoint_events.id (links to raw signal)
  artifact_id UUID,                  -- FK → artifacts.id (if this event produced an artifact)
  stage_id UUID,                     -- FK → job_stages.id (if this event is a billable stage)
  
  -- Minimal context
  context JSONB DEFAULT '{}',        -- Max 512 bytes — routing decisions, flags only
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Replay: all events for a job in order
CREATE INDEX idx_eventbus_job_seq ON event_bus(job_id, sequence_num);

-- Correlation: all events from one user action
CREATE INDEX idx_eventbus_correlation ON event_bus(correlation_id, sequence_num);

-- Cause-effect chain traversal
CREATE INDEX idx_eventbus_parent ON event_bus(parent_event_id);

-- Type-based filtering (e.g., all approval events)
CREATE INDEX idx_eventbus_type ON event_bus(event_type, created_at);

-- Brand-scoped queries
CREATE INDEX idx_eventbus_brand ON event_bus(brand_id, created_at);
```

### Standard Event Types

Events follow `{domain}.{action}` naming:

| Domain | Events | Emitted By |
|--------|--------|------------|
| `intake` | `intake.brief_received`, `intake.asset_uploaded` | Orchestrator |
| `analysis` | `analysis.started`, `analysis.completed`, `analysis.failed` | Asset Analyzer (#4) |
| `planning` | `planning.plan_generated`, `planning.plan_revised` | Creative Director (#1), Strategy (#21) |
| `review` | `review.submitted`, `review.approved`, `review.rejected`, `review.revision_requested` | Plan Review Gate (#2), Review Packet (#19) |
| `generation` | `generation.started`, `generation.completed`, `generation.failed`, `generation.retried` | Provider Routing (#9) |
| `voice` | `voice.tts_requested`, `voice.tts_completed`, `voice.clone_requested`, `voice.dub_requested` | Voice Management (#20) |
| `assembly` | `assembly.started`, `assembly.completed` | Assembly Engine (#8) |
| `postprod` | `postprod.subtitles_added`, `postprod.watermark_applied`, `postprod.enhanced`, `postprod.exported` | Post-Production (#17) |
| `localization` | `localization.translation_started`, `localization.dub_completed`, `localization.cultural_adapted` | Localization (#18) |
| `delivery` | `delivery.review_copy_ready`, `delivery.approved`, `delivery.production_unlocked`, `delivery.downloaded` | Delivery (#17) |
| `routing` | `routing.provider_selected`, `routing.fallback_triggered`, `routing.tier_escalated` | Provider Routing (#9) |
| `feedback` | `feedback.metrics_ingested`, `feedback.weights_updated`, `feedback.rebalance_signal` | Performance Feedback (#22) |
| `campaign` | `campaign.multiplication_started`, `campaign.variant_generated`, `campaign.pack_completed` | Campaign Multiplication (W6) |

### Context Field Rules (Max 512 bytes)

**Allowed**:
```json
{
  "provider_selected": "kie_ai",
  "fallback_reason": "timeout",
  "tier": "standard",
  "variant_index": 2,
  "approval_decision": "approved"
}
```

**NOT allowed** (same rules as touchpoint `metadata`):
- Prompts, media URLs, full schemas, user input

### Replay Query

Full job replay with cause-effect chain:
```sql
SELECT 
  e.sequence_num,
  e.event_type,
  e.module_id,
  e.status,
  e.duration_ms,
  e.parent_event_id,
  e.context
FROM event_bus e
WHERE e.job_id = $1
ORDER BY e.sequence_num;
```

### Correlation Query

All events triggered by a single user action (e.g., "Approve" button click):
```sql
SELECT * FROM event_bus
WHERE correlation_id = $1
ORDER BY sequence_num;
```

---

## Layer 2: Metrics Aggregation — Dashboards & Analytics

### Purpose

Pre-computed rollups for **fast dashboard reads**. No one should ever query raw `touchpoint_events` or `event_bus` for dashboard data — always read from rollup tables.

### Design Principle

**Materialized views** refreshed on schedule. Read-optimized. Never used for billing (billing lives in `job_stages.cost`).

### Schema

#### 2a. Provider Health (Refreshed every 5 minutes)

```sql
CREATE MATERIALIZED VIEW mv_provider_health AS
SELECT
  provider_id,
  date_trunc('hour', created_at) AS hour,
  COUNT(*) AS total_calls,
  COUNT(*) FILTER (WHERE status = 'completed') AS success_count,
  COUNT(*) FILTER (WHERE status = 'failed') AS failure_count,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed')::numeric / NULLIF(COUNT(*), 0) * 100, 2
  ) AS success_rate_pct,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY latency_ms) AS p50_latency_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency_ms,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99_latency_ms,
  SUM(cost_usd) AS total_cost_usd
FROM touchpoint_events
WHERE created_at > now() - INTERVAL '90 days'
GROUP BY provider_id, date_trunc('hour', created_at);

CREATE UNIQUE INDEX idx_mv_provider_health ON mv_provider_health(provider_id, hour);
```

#### 2b. Module Performance (Refreshed every 15 minutes)

```sql
CREATE MATERIALIZED VIEW mv_module_performance AS
SELECT
  module_id,
  date_trunc('day', created_at) AS day,
  COUNT(*) AS total_executions,
  COUNT(*) FILTER (WHERE status = 'failed') AS failures,
  COUNT(*) FILTER (WHERE status = 'retried') AS retries,
  AVG(latency_ms) AS avg_latency_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency_ms,
  SUM(cost_usd) AS total_cost_usd
FROM touchpoint_events
WHERE created_at > now() - INTERVAL '365 days'
GROUP BY module_id, date_trunc('day', created_at);

CREATE UNIQUE INDEX idx_mv_module_perf ON mv_module_performance(module_id, day);
```

#### 2c. Brand Analytics (Refreshed every 30 minutes)

```sql
CREATE MATERIALIZED VIEW mv_brand_analytics AS
SELECT
  j.brand_id,
  date_trunc('week', j.created_at) AS week,
  j.family,
  COUNT(DISTINCT j.id) AS job_count,
  SUM((js.cost->>'cost_usd')::numeric) AS total_spend_usd,
  AVG(EXTRACT(EPOCH FROM (j.completed_at - j.created_at))) AS avg_turnaround_seconds,
  COUNT(*) FILTER (WHERE j.status = 'revision_requested') AS revision_count,
  COUNT(*) FILTER (WHERE j.status = 'approved') AS approval_count
FROM jobs j
LEFT JOIN job_stages js ON js.job_id = j.id
GROUP BY j.brand_id, date_trunc('week', j.created_at), j.family;

CREATE UNIQUE INDEX idx_mv_brand ON mv_brand_analytics(brand_id, week, family);
```

#### 2d. Family Throughput (Refreshed every 15 minutes)

```sql
CREATE MATERIALIZED VIEW mv_family_throughput AS
SELECT
  family,
  date_trunc('day', created_at) AS day,
  COUNT(*) AS jobs_started,
  COUNT(*) FILTER (WHERE status = 'delivered') AS jobs_delivered,
  COUNT(*) FILTER (WHERE status = 'failed') AS jobs_failed,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) AS avg_pipeline_seconds,
  percentile_cont(0.95) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at))
  ) AS p95_pipeline_seconds
FROM jobs
WHERE created_at > now() - INTERVAL '365 days'
GROUP BY family, date_trunc('day', created_at);

CREATE UNIQUE INDEX idx_mv_family ON mv_family_throughput(family, day);
```

### Refresh Schedule

| View | Refresh Interval | Source |
|------|-------------------|--------|
| `mv_provider_health` | 5 min | `touchpoint_events` |
| `mv_module_performance` | 15 min | `touchpoint_events` |
| `mv_brand_analytics` | 30 min | `jobs` + `job_stages` |
| `mv_family_throughput` | 15 min | `jobs` |

Refresh is triggered by a scheduled cron job (pg_cron or edge function):
```sql
SELECT cron.schedule('refresh_provider_health', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_provider_health');
SELECT cron.schedule('refresh_module_perf', '*/15 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_module_performance');
SELECT cron.schedule('refresh_brand_analytics', '*/30 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_brand_analytics');
SELECT cron.schedule('refresh_family_throughput', '*/15 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_family_throughput');
```

### Dashboard Query Examples

| Dashboard Widget | Query Source | Response Time |
|-----------------|-------------|---------------|
| "Provider uptime last 24h" | `mv_provider_health WHERE hour > now() - '24h'` | < 50ms |
| "This brand's weekly spend" | `mv_brand_analytics WHERE brand_id = X` | < 30ms |
| "F2 pipeline P95 latency trend" | `mv_family_throughput WHERE family = 'F2'` | < 30ms |
| "Which module fails most?" | `mv_module_performance ORDER BY failures DESC` | < 30ms |

---

## Layer 3: Audit Trail — Compliance & Trust

### Purpose

Immutable, append-only log of **every decision that affects money, access, or content delivery**. Required for enterprise compliance, dispute resolution, and GDPR data subject access requests.

### Design Principle

- **Append-only**: No UPDATE or DELETE. Ever.
- **Actor-identified**: Every entry records who (user, system, or automated rule).
- **Reason-captured**: Every entry records why the action was taken.
- **Reference-based**: Links to source records, never duplicates content.

### Schema

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- When
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Who
  actor_type TEXT NOT NULL,            -- "user" | "system" | "automated_rule" | "support_agent"
  actor_id UUID,                       -- FK → auth.users (nullable for system actions)
  actor_email TEXT,                    -- Denormalized for long-term readability after user deletion
  
  -- What
  action TEXT NOT NULL,                -- Structured: "{domain}.{verb}"
  resource_type TEXT NOT NULL,         -- "job" | "review_packet" | "artifact" | "brand" | "subscription"
  resource_id UUID NOT NULL,           -- FK → the affected resource
  
  -- Why
  reason TEXT,                         -- Human-readable: "Client approved final cut" | "Auto-approved: no changes requested"
  
  -- Context (NO sensitive data)
  change_summary JSONB DEFAULT '{}',  -- Max 1KB — before/after for key fields only
  
  -- Correlation
  job_id UUID,                        -- FK → jobs (nullable — not all audits are job-scoped)
  correlation_id UUID,                -- FK → event_bus.correlation_id (links to full event chain)
  
  -- IP/Session (for security audits)
  ip_address INET,
  user_agent TEXT
);

-- Chronological audit for a resource
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id, created_at);

-- All actions by a specific user
CREATE INDEX idx_audit_actor ON audit_log(actor_id, created_at);

-- Job-scoped audit trail
CREATE INDEX idx_audit_job ON audit_log(job_id, created_at);

-- Action type filtering (e.g., all approvals)
CREATE INDEX idx_audit_action ON audit_log(action, created_at);

-- GDPR: find all records related to a user
CREATE INDEX idx_audit_actor_email ON audit_log(actor_email);
```

### Auditable Actions

Every action that affects **money, access, or content delivery** must be logged:

| Domain | Actions | Trigger |
|--------|---------|---------|
| `review` | `review.submitted`, `review.approved`, `review.rejected`, `review.revision_requested` | User clicks approve/reject in Review Packet |
| `delivery` | `delivery.production_unlocked`, `delivery.downloaded`, `delivery.link_generated`, `delivery.link_expired` | Approval triggers production unlock; user downloads |
| `billing` | `billing.job_charged`, `billing.credit_applied`, `billing.refund_issued`, `billing.subscription_changed` | Job completes; admin issues refund |
| `access` | `access.brand_member_added`, `access.brand_member_removed`, `access.role_changed`, `access.api_key_rotated` | Team management actions |
| `content` | `content.artifact_deleted`, `content.artifact_replaced`, `content.brand_settings_changed` | User modifies brand or deletes content |
| `routing` | `routing.provider_disabled`, `routing.tier_override`, `routing.fallback_forced` | Admin or automated rule changes routing |
| `gdpr` | `gdpr.data_export_requested`, `gdpr.data_deletion_requested`, `gdpr.data_deletion_completed` | User exercises data rights |

### Change Summary Rules

The `change_summary` field captures **before/after** for key decision fields only:

```json
{
  "field": "status",
  "before": "in_review",
  "after": "approved"
}
```

Or for routing overrides:
```json
{
  "field": "primary_provider",
  "before": "kie_ai",
  "after": "byteplus",
  "reason": "kie_ai P95 > 30s for 2 hours"
}
```

**NOT allowed in `change_summary`**:
- Full prompts, scripts, or creative briefs
- Media file contents or URLs
- Personal data beyond what's in `actor_email`

### Immutability Enforcement

```sql
-- Prevent updates
CREATE OR REPLACE FUNCTION prevent_audit_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only — updates are not permitted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_update();

-- Prevent deletes (except by retention policy)
CREATE OR REPLACE FUNCTION prevent_audit_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.retention_cleanup', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'audit_log is append-only — deletes require retention_cleanup flag';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_delete();
```

### Retention Policy

| Age | Action |
|-----|--------|
| 0–7 years | Full resolution — all entries queryable, immutable |
| 7+ years | Archive to cold storage (S3 Glacier or equivalent), delete from hot DB |

### GDPR Data Subject Access

When a user requests their data (Article 15) or deletion (Article 17):

```sql
-- Article 15: Export all audit records for a user
SELECT * FROM audit_log
WHERE actor_id = $user_id OR actor_email = $user_email
ORDER BY created_at;

-- Article 17: After data deletion, log the deletion itself
INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, reason)
VALUES ('system', $admin_id, 'gdpr.data_deletion_completed', 'user', $user_id, 'User exercised right to erasure');
```

Note: The audit log itself is **retained** after user deletion (legal obligation supersedes deletion right for financial and compliance records). The `actor_email` field ensures auditability even after the `auth.users` record is removed.

---

## Cross-Layer Integration

### How the 3 layers connect

```
User clicks "Approve" on Review Packet
    │
    ├─→ Layer 0: touchpoint_events row (module_id=19, action="approve", latency_ms=200)
    │
    ├─→ Layer 1: event_bus row (event_type="review.approved", correlation_id=X, parent_event_id=Y)
    │       │
    │       └─→ Child events: delivery.production_unlocked, postprod.exported (same correlation_id)
    │
    ├─→ Layer 2: mv_brand_analytics incremented (approval_count +1) on next refresh
    │
    └─→ Layer 3: audit_log row (action="review.approved", actor_id=user, reason="Client approved final cut")
```

### Which layer answers which question

| Question | Layer | Table |
|----------|-------|-------|
| "What happened at 14:32:05?" | Layer 0 | `touchpoint_events` |
| "What triggered this export?" | Layer 1 | `event_bus` (parent chain) |
| "What's our P95 latency this week?" | Layer 2 | `mv_module_performance` |
| "Who approved this and when?" | Layer 3 | `audit_log` |
| "How much did Brand X spend in March?" | Layer 2 | `mv_brand_analytics` |
| "Why was the provider switched mid-job?" | Layer 3 | `audit_log` (routing.fallback_forced) |
| "Show me the full journey of job Y" | Layer 1 | `event_bus` (replay query) |
| "Is ElevenLabs healthy right now?" | Layer 2 | `mv_provider_health` |
| "Did this user consent to data processing?" | Layer 3 | `audit_log` (gdpr domain) |

---

## Cross-References

| Document | Relationship |
|----------|-------------|
| `PIPELINE_CONTRACTS.md` — Touchpoint Event Contract | Layer 0 — raw signal schema (foundation for all 3 layers) |
| `PIPELINE_CONTRACTS.md` — Cost Tracking / Billing Hierarchy | Billing lives in `job_stages.cost` — Layer 2 mirrors for dashboards, Layer 3 logs for compliance |
| `engines/PERFORMANCE_FEEDBACK_ENGINE.md` | Consumes Layer 2 metrics to emit optimization signals |
| `engines/REVIEW_PACKET_ENGINE.md` | Layer 3 logs every approval/rejection decision |
| `engines/PROVIDER_ROUTING_POLICY.md` | Layer 1 captures routing decisions; Layer 3 audits overrides |
| `ENGINE_MODULE_REGISTRY.md` | Module IDs (1-22) used across all layers |
