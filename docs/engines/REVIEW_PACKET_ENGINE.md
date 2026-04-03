# Module #19 — Review Packet Engine

> **Status**: Design reference  
> **Last updated**: 2026-04-03  
> **Owner**: Cross-family  
> **Depends on**: Module #17 (Delivery & Post-Production), Module #9 (Provider & Tier Routing), Trust & Explainability Engine

---

## Purpose

Create structured, human-reviewable approval objects that make it easy for stakeholders to evaluate, compare, and approve creative outputs — without accessing raw production files.

Without this engine, approvals are ad-hoc: reviewers get raw links, no context, no versioning, and no audit trail. The Review Packet Engine is the backbone of Brandflow's **approval-first** promise.

---

## Review Packet Schema

```json
{
  "packet_id": "uuid",
  "job_id": "uuid",
  "initiative_id": "uuid",
  "plan_id": "uuid (ref: PLAN_OBJECT_SCHEMA.md)",
  "family": "F1|F2|F3|F4|F5|F6|F7|F8|F9",
  "version": 1,
  "revision_round": 1,
  "status": "pending_review | approved | rejected | revision_requested",
  "created_at": "ISO 8601",
  "expires_at": "ISO 8601",

  "preview_assets": [
    {
      "asset_id": "uuid",
      "type": "video | image | audio | text",
      "preview_url": "string (stream-only, watermarked)",
      "thumbnail_url": "string",
      "duration_s": "number | null",
      "aspect_ratio": "string",
      "resolution": "720p (review cap)",
      "watermarked": true,
      "stream_only": true
    }
  ],

  "caption_options": [
    {
      "platform": "string",
      "caption": "string",
      "hashtags": ["string"],
      "cta": "string | null"
    }
  ],

  "language_versions": [
    {
      "language": "string (BCP-47)",
      "market_profile": "string",
      "subtitle_preview_url": "string",
      "dubbed_audio_preview_url": "string | null",
      "cultural_flags": ["string"]
    }
  ],

  "aspect_ratio_versions": [
    {
      "aspect_ratio": "9:16 | 1:1 | 4:5 | 16:9",
      "preview_url": "string (watermarked)",
      "platform_target": "string"
    }
  ],

  "thumbnail_set": [
    {
      "thumbnail_url": "string",
      "timestamp_s": "number",
      "selected": false
    }
  ],

  "metadata": {
    "brand_voice_score": "number (0-100)",
    "character_consistency_score": "number (0-100) | null",
    "generation_cost_estimate": {
      "generation_usd": "number",
      "post_production_usd": "number",
      "total_usd": "number"
    },
    "generation_tier": "draft | standard | premium",
    "provider_route": {
      "primary": "string (provider_id)",
      "model": "string"
    },
    "fallback_route": {
      "provider": "string (provider_id)",
      "model": "string"
    },
    "risk_level": "low | medium | high",
    "latency_tier": "fast | standard | quality",
    "total_generation_time_s": "number"
  },

  "version_history": [
    {
      "version": 1,
      "created_at": "ISO 8601",
      "status": "rejected",
      "reviewer": "string (user_id or email)",
      "feedback": "string",
      "revision_notes": "string | null",
      "diff_summary": "string | null"
    }
  ],

  "operator_notes": [
    {
      "author": "system | human",
      "timestamp": "ISO 8601",
      "note": "string"
    }
  ],

  "review_config": {
    "max_review_cycles": 3,
    "auto_expire_hours": 72,
    "require_all_approvers": false,
    "approvers": ["user_id"],
    "notification_channels": ["email", "in_app"]
  },

  "approval_chain": [
    {
      "step": 1,
      "role": "reviewer | approver | admin | creative_director",
      "user_id": "uuid",
      "decision": "pending | approved | rejected | skipped",
      "decided_at": "ISO 8601 | null",
      "auto_approved": false,
      "escalated_from_step": "number | null"
    }
  ]
}
```

---

## Review States

```
                    ┌──────────────┐
                    │   created    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │pending_review │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──┐  ┌──────▼──┐  ┌─────▼──────┐
       │approved │  │rejected │  │  revision   │
       └─────────┘  └─────────┘  │ _requested  │
                                 └──────┬──────┘
                                        │
                                 ┌──────▼──────┐
                                 │ new_version  │
                                 │  created     │
                                 └──────┬──────┘
                                        │
                                 ┌──────▼───────┐
                                 │pending_review │
                                 └──────────────┘
```

### State Transitions

| From | To | Trigger |
|------|----|---------|
| `created` | `pending_review` | Packet assembly complete |
| `pending_review` | `approved` | All required approvers accept |
| `pending_review` | `rejected` | Any approver rejects (terminal) |
| `pending_review` | `revision_requested` | Approver requests changes |
| `revision_requested` | `pending_review` | New version created via Re-entry Controller (#10) |
| `pending_review` | `expired` | `auto_expire_hours` exceeded |

---

## Packet Assembly Process

### Step 1 — Collect Preview Assets

After Module #17 (Post-Production) produces watermarked review copies:
- Video: 720p, watermarked, stream-only (no download)
- Image: Watermarked, reduced resolution
- Audio: Preview quality (128kbps)

### Step 2 — Attach Caption Options

Pull generated captions from the Creative Director Agent (#1) output, organized by target platform.

### Step 3 — Attach Language Versions

If Module #18 (Localization) has produced variants, include preview URLs for each language version with cultural flag annotations.

### Step 4 — Compute Metadata

- Query Brand Voice DNA Engine (#12) for voice alignment score
- Query Character Consistency Engine (#13) for consistency score (if multi-scene)
- Aggregate cost from `job_stages.cost` entries
- Record provider and tier used

### Step 5 — Initialize Version History

Create version 1 entry. Link to any prior packets for the same job (revision chain).

### Step 6 — Notify Approvers

Send notifications via configured channels. Start expiry countdown.

---

## Security Model

| Rule | Implementation |
|------|----------------|
| No raw file access | Preview URLs are stream-only, watermarked, and time-limited |
| No downloads until approved | Production export URLs return `null` until status = `approved` |
| Audit trail | Every state change logged with user, timestamp, and feedback |
| Expiry | Packets auto-expire after configurable window (default 72h) |
| Access control | Only listed approvers can view packet contents |

---

## Integration Points

| Engine | Interaction |
|--------|------------|
| #10 Re-entry Controller | Triggers new version creation on `revision_requested` |
| #17 Delivery & Post-Production | Provides watermarked preview assets |
| #18 Localization | Provides language version previews |
| #1 Creative Director Agent | Provides caption options |
| #12 Brand Voice DNA | Provides voice alignment score |
| #13 Character Consistency | Provides consistency score |

---

## Cross-Family Adoption

| Family | Adoption |
|--------|----------|
| F1 UGC Video | ✅ |
| F2 AI Spokesperson | ✅ |
| F3 Product Videography | ✅ |
| F4 Social Content | ✅ |
| F5 Cinematic Ad | ✅ |
| F6 Core Elements Board | — (no approval needed) |
| F7 Ad Creator | ✅ |
| F8 Creative Cloner | ✅ |
| F9 Image Template | ✅ |

---

## Database Schema

### Approval Policies

Approval chains are driven by configurable policies stored per brand. These determine who reviews what, based on cost thresholds, family type, and tier.

```json
{
  "policy_id": "uuid",
  "brand_id": "uuid",
  "name": "string",
  "rules": [
    {
      "condition": {
        "family": "F5 | * (any)",
        "tier": "premium | * (any)",
        "cost_threshold_usd": 50
      },
      "chain": [
        { "step": 1, "role": "reviewer" },
        { "step": 2, "role": "creative_director" },
        { "step": 3, "role": "admin" }
      ],
      "require_all": true
    },
    {
      "condition": {
        "family": "F4",
        "tier": "standard",
        "cost_threshold_usd": 5
      },
      "chain": [],
      "auto_approve": true,
      "auto_approve_reason": "Low-cost standard social content"
    }
  ]
}
```

### Policy Rules

| Condition | Chain Depth | Behavior |
|-----------|-------------|----------|
| F5 Cinematic, any tier | 3-step | Always requires creative director sign-off |
| Any family, premium tier, cost > $50 | 2-step | Escalates to admin |
| F4 Social, standard tier, cost < $5 | 0-step | Auto-approved |
| Any family, first use by brand | 2-step | Requires admin awareness |
| Budget check = `warning` | +1 step | Adds budget admin to chain |

### Escalation Logic

```
Step 1: Reviewer has 24h to act
  │
  ├── Approved → Step 2 (if chain has more steps)
  ├── Rejected → Terminal (packet rejected)
  ├── No action within 24h → Auto-escalate to next step
  └── Revision requested → Back to generation
```

---

## Database Schema

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

CREATE TABLE approval_chain_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID REFERENCES review_packets(id) NOT NULL,
  step INTEGER NOT NULL,
  role TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  decision TEXT NOT NULL DEFAULT 'pending',
  decided_at TIMESTAMPTZ,
  auto_approved BOOLEAN DEFAULT false,
  escalated_from_step INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (packet_id, step)
);

CREATE INDEX idx_approval_policies_brand ON approval_policies(brand_id);
CREATE INDEX idx_approval_chain_packet ON approval_chain_entries(packet_id);

CREATE TABLE review_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) NOT NULL,
  family TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  preview_assets JSONB NOT NULL DEFAULT '[]',
  caption_options JSONB DEFAULT '[]',
  language_versions JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  review_config JSONB NOT NULL,
  UNIQUE (job_id, version)
);

CREATE TABLE review_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID REFERENCES review_packets(id) NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL, -- approved | rejected | revision_requested
  feedback TEXT,
  revision_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE review_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID REFERENCES review_packets(id) NOT NULL,
  author TEXT NOT NULL, -- 'system' or user_id
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
