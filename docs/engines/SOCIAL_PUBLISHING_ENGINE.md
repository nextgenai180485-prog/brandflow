# Module #27 — Social Publishing Engine

> **Status**: Design reference  
> **Last updated**: 2026-04-03  
> **Owner**: Distribution Engine  
> **Depends on**: Module #17 (Delivery & Post-Production), Module #19 (Review Packet Engine)

---

## Purpose

Close the delivery-to-publish gap. Currently, Brandflow's pipeline stops at export — users must manually post approved content to their social accounts. This engine automates the last mile: publishing approved, production-ready content to connected social platforms.

---

## Responsibilities

| Responsibility | Description |
|----------------|-------------|
| Social Account Connection | OAuth-based connection to social platforms |
| Publish Queue Management | Queue approved content for scheduled or immediate posting |
| Platform-Specific Packaging | Format content to each platform's requirements (aspect ratio, caption limits, hashtags) |
| Publish Execution | Execute API calls to publish content |
| Publish Status Tracking | Track publish state (queued → publishing → published → failed) |
| Failure Handling | Retry logic, failure notifications, fallback behavior |
| Publish Audit Trail | Log every publish action for compliance |
| Optimal Timing | Schedule posts at platform-optimal times (fed by Category Intelligence Cache) |

---

## Publish Flow

```
Approved Production Asset
  │
  ├─── Publish Queue Entry
  │      └─ Check: is social account connected?
  │      └─ Check: does user have auto-publish enabled?
  │      └─ If manual: add to publish queue for user scheduling
  │      └─ If auto: schedule at optimal time
  │
  ├─── Platform Packaging
  │      └─ Select correct export format for target platform
  │      └─ Apply caption with platform-specific character limits
  │      └─ Apply hashtag strategy (platform-specific)
  │      └─ Attach thumbnail/cover image if required
  │      └─ Validate media specs (resolution, duration, file size)
  │
  ├─── Publish Execution
  │      └─ API call to platform
  │      └─ Handle rate limits and quotas
  │      └─ Capture publish confirmation (post ID, URL)
  │
  ├─── Status Update
  │      └─ Update publish status in DB
  │      └─ Notify user of publish success/failure
  │      └─ Log to audit trail (Layer 3)
  │
  └─── Performance Handoff
         └─ Pass publish metadata to Performance Feedback Engine (#22)
         └─ Include: post_id, platform, published_at, asset_id
         └─ Triggers T+24h metric collection
```

---

## Publish States

```
queued → scheduled → publishing → published
                                     ↓
                              publish_failed → retry_queued → publishing
                                     ↓ (after max retries)
                              permanently_failed
```

| State | Description |
|-------|-------------|
| `queued` | Content approved, waiting for scheduling |
| `scheduled` | Publication time set (auto or manual) |
| `publishing` | API call in progress |
| `published` | Successfully posted; post_id captured |
| `publish_failed` | API call failed; retry eligible |
| `retry_queued` | Queued for retry (max 3 retries, exponential backoff) |
| `permanently_failed` | Max retries exhausted; user notified |

---

## Platform Integration

### Phase 1 — Initial Targets

| Platform | API | Status | Capabilities |
|----------|-----|--------|-------------|
| **Instagram** | Meta Graph API | Planned | Reels, feed posts, carousels, stories |
| **Facebook** | Meta Graph API | Planned | Posts, reels, stories |

### Phase 2 — Expansion

| Platform | API | Status | Capabilities |
|----------|-----|--------|-------------|
| **TikTok** | TikTok Content Posting API | Planned | Video posts |
| **LinkedIn** | LinkedIn Marketing API | Placeholder | Posts, articles |
| **X (Twitter)** | X API v2 | Placeholder | Tweets, threads |
| **YouTube** | YouTube Data API v3 | Placeholder | Shorts, videos |
| **Pinterest** | Pinterest API | Placeholder | Pins |

---

## Social Account Schema

```json
{
  "social_account": {
    "account_id": "uuid",
    "brand_id": "uuid",
    "platform": "instagram | facebook | tiktok | linkedin | twitter | youtube | pinterest",
    "platform_user_id": "string",
    "platform_username": "string",
    "access_token": "encrypted string",
    "refresh_token": "encrypted string | null",
    "token_expires_at": "ISO 8601",
    "scopes": ["publish_content", "read_insights"],
    "status": "connected | expired | revoked",
    "auto_publish": false,
    "connected_at": "ISO 8601",
    "last_published_at": "ISO 8601 | null"
  }
}
```

---

## Publish Record Schema

```json
{
  "publish_record": {
    "publish_id": "uuid",
    "artifact_id": "uuid",
    "job_id": "uuid",
    "brand_id": "uuid",
    "social_account_id": "uuid",
    "platform": "string",
    "status": "queued | scheduled | publishing | published | publish_failed | retry_queued | permanently_failed",
    "scheduled_at": "ISO 8601 | null",
    "published_at": "ISO 8601 | null",
    "platform_post_id": "string | null",
    "platform_post_url": "string | null",
    "caption": "string",
    "hashtags": ["string"],
    "retry_count": 0,
    "error_message": "string | null",
    "created_at": "ISO 8601"
  }
}
```

---

## Integration Points

| Engine | Interaction |
|--------|------------|
| #17 Delivery & Post-Production | Provides production-ready exports in platform-specific formats |
| #19 Review Packet Engine | Only `approved` assets enter publish queue |
| #22 Performance Feedback Engine | Publish metadata triggers metric collection |
| #21 Strategy Engine | Schedule timing, posting cadence from strategy plan |
| Category Intelligence Cache | Optimal posting times per platform + vertical |
| Audit Trail (Layer 3) | Every publish/failure logged immutably |

---

## Cross-Family Adoption

| Family | Publishing |
|--------|-----------|
| F1 UGC Video | ✅ Reels, TikTok videos |
| F2 AI Spokesperson | ✅ Reels, TikTok, YouTube Shorts |
| F3 Product Videography | ✅ Reels, TikTok, feed video |
| F4 Social Content | ✅ Feed posts, carousels, text posts |
| F5 Cinematic Ad | ✅ Reels, YouTube, feed video |
| F6 Core Elements Board | — (internal asset, not published) |
| F7 Ad Creator | ✅ Feed posts, reels |
| F8 Creative Cloner | ✅ Reels, TikTok |
| F9 Image Template | ✅ Feed posts, carousels, stories |

---

## Database Schema

```sql
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  platform TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  platform_username TEXT,
  access_token TEXT NOT NULL, -- encrypted at rest
  refresh_token TEXT, -- encrypted at rest
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'connected', -- 'connected' | 'expired' | 'revoked'
  auto_publish BOOLEAN DEFAULT false,
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_published_at TIMESTAMPTZ,
  UNIQUE (brand_id, platform, platform_user_id)
);

CREATE TABLE publish_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL,
  job_id UUID,
  brand_id UUID NOT NULL,
  social_account_id UUID REFERENCES social_accounts(id) NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
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

CREATE INDEX idx_social_accounts_brand ON social_accounts(brand_id);
CREATE INDEX idx_publish_records_brand ON publish_records(brand_id);
CREATE INDEX idx_publish_records_status ON publish_records(status);
CREATE INDEX idx_publish_records_scheduled ON publish_records(scheduled_at) WHERE status = 'scheduled';
```
