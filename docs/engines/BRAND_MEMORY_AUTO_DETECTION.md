# Brand Memory Auto-Detection Logic

> **Status**: Design reference  
> **Last updated**: 2026-04-03  
> **Owner**: Brand Memory Engine  
> **Purpose**: Define how Brand Memory automatically infers, associates, and loads brand-specific intelligence without manual configuration

---

## Why This Matters

Brand Memory is only powerful if it can **automatically** infer:

- What brand this user/project belongs to
- What assets belong to it
- What approved styles exist
- What performance history matters
- What prior campaign logic should be loaded

If this layer is weak, the entire "memory-backed intelligence" promise weakens.

---

## Auto-Detection Domains

### 1. Brand–User Association

**Goal**: Automatically determine which brand context to load for any request.

```
Detection Chain:
  1. Explicit brand_id in request → direct lookup
  2. User's active workspace/project → workspace.brand_id
  3. User's team membership → team.default_brand_id
  4. Single-brand user → auto-select their only brand
  5. Multi-brand user → prompt selection (cached for session)
```

**Rules**:
- If user has exactly 1 brand → auto-load, no prompt
- If user has 2–5 brands → show recent-first selector, cache selection for session
- If user has 5+ brands → show searchable selector with recent/frequent sort
- API requests MUST include explicit brand_id (no inference)

### 2. Asset Ownership Detection

**Goal**: Automatically associate generated assets with the correct brand and track reuse eligibility.

```json
{
  "asset_association_rules": {
    "on_artifact_created": {
      "brand_id": "inherit from job.brand_id",
      "campaign_id": "inherit from plan_object.intent.campaign_track_id",
      "family": "inherit from job.family",
      "tags": "auto-generated from: angle, hook_style, platform, visual_style"
    },
    "on_artifact_approved": {
      "action": "insert into asset_memory with status='active'",
      "reuse_eligible": true,
      "engagement_score": null,
      "reuse_count": 0
    },
    "on_artifact_rejected": {
      "action": "insert into asset_memory with status='rejected'",
      "reuse_eligible": false,
      "rejection_reason": "from review_packet.rejection_reason"
    }
  }
}
```

### 3. Approved Style Detection

**Goal**: Automatically learn visual and voice style preferences from approval/rejection patterns.

```
Signal Sources:
  1. Review Packet approvals → extract: angle, hook_style, visual_style, tone
  2. Review Packet rejections → extract: reason, pattern_type
  3. Revision requests → extract: what changed, why
  4. Performance signals → extract: what performed well/poorly

Inference Logic:
  - If angle X approved 3+ times with no rejections → preferred_angle (confidence: 0.75)
  - If angle X approved 5+ times → preferred_angle (confidence: 0.90)
  - If hook_style Y rejected 3+ times → avoided_hook (confidence: 0.70)
  - If hook_style Y rejected 5+ times → do_not_use (auto-flagged)
  - If visual_style Z appears in top 3 performing assets → preferred_visual (confidence: 0.80)
```

**Confidence Scoring**:

| Sample Size | Base Confidence | Modifier |
|------------|----------------|----------|
| 1–2 interactions | 0.30 | Tentative — no action taken |
| 3–5 interactions | 0.60 | Emerging pattern — soft bias applied |
| 6–10 interactions | 0.80 | Strong pattern — active bias |
| 11+ interactions | 0.90 | Established preference — hard bias |

### 4. Performance History Loading

**Goal**: Automatically surface relevant historical performance when planning new content.

```
Query Strategy:
  1. Same brand + same family + same platform → highest relevance
  2. Same brand + same family + different platform → medium relevance
  3. Same brand + different family + same platform → lower relevance
  4. Same vertical + same platform (cross-brand, anonymized) → category signal only

Recency Weighting:
  - Last 30 days: weight 1.0
  - 31–90 days: weight 0.7
  - 91–180 days: weight 0.4
  - 181+ days: weight 0.2 (context only, not decision-driving)
```

### 5. Prior Campaign Context Retrieval

**Goal**: Automatically load relevant prior campaign logic when starting a new campaign.

```
Campaign Context Loading:
  1. Check: is this request part of an existing campaign_track_id?
     → If yes: load full campaign context (previous assets, angles used, performance)
  
  2. Check: has this brand run campaigns in the same vertical/platform recently?
     → If yes: load summary (winning angles, best hooks, audience insights)
  
  3. Check: does the Category Intelligence Cache have relevant category patterns?
     → If yes: inject category norms as baseline context
  
  4. Default: load brand_memory snapshot (all-time preferences, do_not_use, approval patterns)
```

### 6. Do-Not-Use Pattern Auto-Detection

**Goal**: Automatically flag patterns that consistently get rejected.

```
Detection Rules:
  Rule 1: Same hook_style rejected 5+ times → auto-flag
    - Pattern type: "hook_style"
    - Source: "rejection_pattern"
    - Confidence: rejection_count / (approval_count + rejection_count)

  Rule 2: Same visual element rejected 3+ times with same reason → auto-flag
    - Pattern type: "visual_element"
    - Source: "rejection_pattern"
    - Requires: consistent rejection_reason across instances

  Rule 3: Same phrase/CTA revised 4+ times → auto-flag
    - Pattern type: "phrase"
    - Source: "revision_pattern"
    - Tracks: specific text patterns that trigger revisions

  Rule 4: Manual user flag → immediate flag
    - Pattern type: any
    - Source: "manual_flag"
    - No threshold — user intent is explicit

  Rule 5: Compliance-triggered → immediate flag
    - Pattern type: "visual_element" | "phrase" | "angle"
    - Source: "compliance"
    - Overrides all other signals
```

**Auto-Flag Lifecycle**:

```
Detected → Flagged (soft) → Confirmed (hard) → Permanent

- Flagged (soft): Pattern excluded from recommendations but can be overridden by user
- Confirmed (hard): Pattern excluded from recommendations, override requires explicit justification
- Permanent: Pattern never recommended, manual removal only by brand admin
```

---

## Memory Loading Sequence

When a new request arrives, Brand Memory loads in this order:

```
1. Resolve brand_id (from request, workspace, or user prompt)
2. Load brand_memory record (approval patterns, preferences)
3. Load do_not_use_registry for brand_id
4. Load asset_memory (reusable assets with engagement scores)
5. Load creative_history (recent campaigns, angles used, outcomes)
6. Load user_preference_memory (format, visual, voice, platform preferences)
7. Package as brand_memory_snapshot → pass to Decision Engine (#26)
```

**Target latency**: < 200ms for full memory snapshot (all queries parallelized, indexed).

---

## Memory Update Triggers (Expanded)

| Trigger Event | Memory Action | Latency |
|--------------|---------------|---------|
| Artifact approved | Insert asset_memory (active), update approval_memory | Sync |
| Artifact rejected | Insert asset_memory (rejected), update rejection_memory, check do_not_use threshold | Sync |
| Revision requested | Update preference_memory (revision reasons), track revision patterns | Sync |
| Performance signal received | Update asset_memory (engagement_score), update creative_history | Async (T+24h) |
| User flags "do not use" | Insert do_not_use_registry (manual_flag, immediate) | Sync |
| 5+ rejections of same pattern | Insert do_not_use_registry (rejection_pattern, auto) | Sync |
| Campaign completed | Update creative_history (campaign summary) | Async |
| Brand Voice DNA updated | Invalidate voice preference cache, re-score preferences | Async |

---

## Database Support

All auto-detection logic operates against these tables (defined in `db/BRANDFLOW_SQL_SCHEMA.md`):

| Table | Auto-Detection Role |
|-------|-------------------|
| `brand_memory` | Central preferences and approval patterns |
| `asset_memory` | Asset ownership and reuse tracking |
| `user_preference_memory` | Inferred preference patterns with confidence |
| `creative_history` | Campaign and creative outcome history |
| `do_not_use_registry` | Auto-flagged and manual-flagged patterns |
| `brand_profiles` | Brand identity context |
| `review_packets` | Approval/rejection signal source |
| `performance_signals` | Engagement signal source |

---

## Consumers

| Consumer | What They Receive |
|----------|------------------|
| Decision Engine (#26) | Full `brand_memory_snapshot` for strategic decisioning |
| Creative Direction (#23) | Preferred styles, avoided styles, do_not_use patterns |
| Hook Library (#11) | Approved/rejected hook filtering |
| Strategy Engine (#21) | Campaign history, family usage patterns |
| Research Engine (#25) | Historical performance for gap analysis |
| Trust & Explainability Engine | Memory-sourced evidence for decision rationale |

---

## Cross-References

| Document | Relevance |
|----------|-----------|
| `engines/BRAND_MEMORY_ENGINE.md` | Memory categories, schema, query interface |
| `engines/PERFORMANCE_FEEDBACK_ENGINE.md` | Signal source for memory updates |
| `engines/DECISION_ENGINE.md` | Primary consumer of brand memory |
| `db/BRANDFLOW_SQL_SCHEMA.md` | Table definitions |
| `BRANDFLOW_IMPLEMENTATION_PRIORITIES.md` | Implementation timeline (Tier 1 + Tier 2) |
