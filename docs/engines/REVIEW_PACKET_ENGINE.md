# Module #19 — Review Packet Engine

> **Status**: Design reference  
> **Last updated**: 2026-03-31  
> **Owner**: Cross-family  
> **Depends on**: Module #17 (Delivery & Post-Production), Module #9 (Provider & Tier Routing)

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

  "metadata": {
    "brand_voice_score": "number (0-100)",
    "character_consistency_score": "number (0-100) | null",
    "estimated_cost_usd": "number",
    "generation_tier": "draft | standard | premium",
    "provider_used": "string",
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
  }
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

```sql
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
