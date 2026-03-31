# Social Content Batch Pipeline — Technical Reference

> Reverse-engineered from production n8n workflow: `Automated AI Powered Social Media Content Factory for X + Facebook + Instagram + LinkedIn`

---

## Overview

A text-first, multi-platform social content generator. Takes a topic, optional keywords, and optional link — then generates platform-optimized posts for 7 social platforms in a single AI call. Optionally generates a post image and routes through an approval gate before publishing.

**Core principle**: Generate all platform-specific content simultaneously from a single brief, with platform-aware tone, format, and hashtag optimization.

---

## Pipeline Stages

```text
Form Input (Topic, Keywords, Link) → AI Agent (GPT-4o, 7 platforms) → Structured Output
  → [parallel] Generate Post Image (DALL-E/Seedream) → Upload to imgbb
  → Prepare Approval Email (GPT-4o-mini, HTML formatting)
  → Gmail Approval Gate (Approve/Reject)
  → [if approved] Parallel Platform Publishing
    → Instagram (image + caption) → Facebook (image + post) → X/Twitter (text)
    → LinkedIn (image + post) → Merge Results
```

---

## Stage 1: Brief Intake

**Source**: n8n Form Trigger (Brandflow: web UI form)

**Inputs**:
| Field | Type | Required | Example |
|-------|------|----------|---------|
| `Topic` | string | Yes | "New Product Launch" |
| `Keywords or Hashtags` | string | No | "#skincare #beauty #newlaunch" |
| `Link` | URL | No | "https://example.com/product" |

---

## Stage 2: Content Generation (AI Agent)

**Purpose**: Generate platform-specific content for all 7 platforms in one call.

**Provider**: OpenAI GPT-4o + Structured Output Parser

**Platforms supported**:
1. **LinkedIn** — Professional, business-oriented (3-4 sentences)
2. **Instagram** — Visual storytelling, emojis, creative captions (2-3 sentences)
3. **Facebook** — Friendly, community-focused (2-3 sentences)
4. **X/Twitter** — Concise, impactful (≤150 characters)
5. **TikTok** — Fun, video-suggestion focused (15-60s concept)
6. **Threads** — Conversational, discussion-driven (1-2 paragraphs)
7. **YouTube Shorts** — Short-form video concept with title + description

**System prompt**: The agent acts as a content creation AI with platform-specific guidelines for tone, hashtags, CTAs, and content length. Each platform has detailed formatting rules.

**Output Schema**:
```json
{
  "name": "Campaign name",
  "description": "Campaign description",
  "platform_posts": {
    "LinkedIn": {
      "image_suggestion": "string",
      "post": "string",
      "hashtags": ["string"],
      "call_to_action": "string"
    },
    "Instagram": {
      "image_suggestion": "string",
      "caption": "string",
      "hashtags": ["string"],
      "emojis": ["string"],
      "call_to_action": "string"
    },
    "Facebook": {
      "post": "string",
      "hashtags": ["string"],
      "call_to_action": "string",
      "image_suggestion": "string"
    },
    "X-Twitter": {
      "video_suggestion": "string",
      "image_suggestion": "string",
      "post": "string",
      "hashtags": ["string"],
      "character_limit": 150
    },
    "TikTok": {
      "video_suggestion": "string",
      "caption": "string",
      "hashtags": ["string"],
      "call_to_action": "string"
    },
    "Threads": {
      "image_suggestion": "string",
      "text_post": "string",
      "hashtags": ["string"],
      "call_to_action": "string"
    },
    "YouTube_Shorts": {
      "video_suggestion": "string",
      "title": "string",
      "description": "string",
      "hashtags": ["string"],
      "call_to_action": "string"
    }
  },
  "additional_notes": "string"
}
```

---

## Stage 3: Image Generation

**Purpose**: Generate a post image based on the Instagram caption (used across platforms).

**Provider**: OpenAI DALL-E (Brandflow: Seedream 5 Lite via A/B test)

**Input**: Instagram caption from Stage 2 output
**Output**: Binary image data

### Image Hosting

**Original**: Upload to imgbb.com via API
```
POST https://api.imgbb.com/1/upload
  - image: binary data
  - expiration: 0 (permanent)
  - key: IMGBB_API_KEY
```

**Brandflow replacement**: Upload to Supabase Storage, return public URL.

---

## Stage 4: Approval Gate

### Email Formatting

**Provider**: GPT-4o-mini (formats the structured JSON into a clean HTML email)

**Purpose**: Convert the platform posts JSON into a readable, mobile-responsive HTML email for client/team review.

### Approval

**Provider**: Gmail Send-and-Wait (Brandflow: in-app approval UI)

**Flow**:
1. Send formatted HTML email to approver
2. Wait up to 45 minutes for response
3. Approver clicks Approve or Reject
4. If approved → proceed to publishing
5. If rejected → stop

**Brandflow replacement**: In-app review interface with approve/reject/edit capabilities. No email needed.

---

## Stage 5: Platform Publishing (if approved)

**Parallel publishing** to all platforms simultaneously:

| Platform | Method | Key Fields |
|----------|--------|------------|
| **Instagram** | Facebook Graph API v20.0 | `image_url` + `caption` (two-step: create media → publish) |
| **Facebook** | Facebook Graph API v20.0 | `message` + `link` + binary image |
| **X/Twitter** | Twitter OAuth2 API | `text` (post content) |
| **LinkedIn** | LinkedIn OAuth2 API | `text` + `hashtags` + `call_to_action` + image |

**Results aggregation**: All platform responses are merged into a single results object for logging.

---

## Provider Summary

| Stage | Provider | API Endpoint | Auth |
|-------|----------|-------------|------|
| Content Generation | OpenAI GPT-4o | OpenAI API (chat) | API key |
| Email Formatting | OpenAI GPT-4o-mini | OpenAI API (chat) | API key |
| Image Generation | OpenAI DALL-E | OpenAI API (image) | API key |
| Image Hosting | imgbb | `api.imgbb.com/1/upload` | API key |
| Approval | Gmail | Gmail API (send-and-wait) | OAuth2 |
| Instagram | Facebook Graph API | `graph.facebook.com/v20.0` | OAuth2 |
| Facebook | Facebook Graph API | `graph.facebook.com/v20.0` | OAuth2 |
| X/Twitter | Twitter API v2 | Twitter API | OAuth2 |
| LinkedIn | LinkedIn API | LinkedIn API | OAuth2 |

---

## Key Design Notes

1. **Text-first pipeline**: Unlike video families, this generates all content as text — images are supplementary
2. **Single AI call** generates content for all 7 platforms simultaneously (efficient)
3. **Image/video suggestions are textual creative directions**, not rendered assets — they describe what SHOULD be created
4. **TikTok and YouTube Shorts** include `video_suggestion` fields — these are concepts for future video generation, not actual videos
5. **Instagram two-step publish**: First creates a media container, then publishes it (Facebook Graph API requirement)
6. **Character limit enforcement**: X/Twitter posts are constrained to 150 characters in the schema

---

## Brandflow Implementation Notes

1. **Replace imgbb** with Supabase Storage for image hosting
2. **Replace Gmail approval** with in-app review UI (approve/reject/edit per platform)
3. **Replace platform APIs** with Brandflow's social publishing module (or keep direct API integrations)
4. **Image generation swap**: Replace DALL-E with Seedream 5 Lite (via Kie AI/Fal AI/Replicate A/B test)
5. **Video suggestion fields** can be used to auto-trigger UGC or Spokesperson pipelines for platforms that need video content
6. **The structured output schema** should be stored as a `generation_output` JSONB field in the artifacts table for per-platform access
7. **Batch scheduling**: This pipeline is fast (~30s total) — suitable for recurring scheduled runs
