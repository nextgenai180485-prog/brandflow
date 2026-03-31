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

---

## Enterprise Engine Integration

> Applied from Cross-Family Engine Audit — standardizes this pipeline with enterprise-grade shared modules.

### 1. Creative Director Agent (upgrades Stage 2)

Upgrade content generation from simple GPT-4o call to full AGENT framework:
- **Think Tool**: Mandatory reasoning pass — analyze industry, brand voice, platform requirements before generating
- **AGENT structure**: Ask → Guidance → Examples → Notation → Tools
- **Structured creative summary**: Include platform strategy rationale, hook type used, estimated engagement
- Currently a single AI call — upgrade to agent with reasoning for higher quality output

### 2. Hook Library Injection (new, pre-Stage 2)

Query the `hooks` table BEFORE content generation:
- Filter by: brand's industry tags, target platforms, performance tier (A/B)
- Retrieve: 3-5 top-performing hooks as few-shot examples
- Inject into the generation prompt as "Examples of proven hooks in your industry:"
- This grounds all generated content in real-world performance data
- See `HOOK_LIBRARY_ENGINE_DESIGN.md` for full schema and query patterns

### 3. Core Elements Board Injection

- Core Elements Board image (from F6) used as visual context for image generation (Stage 3)
- Helps Seedream/DALL-E maintain brand visual consistency
- If brand has no Core Elements Board → use raw product images as fallback

### 4. Image Template Engine (replaces Stage 3)

Switch from DALL-E to Seedream 5 Lite via Image Template Engine:
- Select from pre-designed templates matching the content type and platform
- Two-pass generation: base scene → product fusion (SeedEdit 3.0)
- See `IMAGE_TEMPLATE_ENGINE_DESIGN.md` for full pipeline
- Higher quality, brand-consistent images vs generic DALL-E output

### 5. Plan Review Gate (enhances Stage 4)

Social Content already has an approval gate — enhance it:
- Show per-platform content preview (not just email dump)
- Allow per-platform approve/reject (approve LinkedIn but reject TikTok)
- Show hook type used and confidence score
- On rejection → route to Revision Agent (currently rejection = stop)

### 6. Revision Loop (new, replaces rejection = stop)

When user rejects content:
- **RevisionAgent** receives: original topic/keywords + original platform posts + user rejection comments
- Generates revised content incorporating feedback per-platform
- Re-submits to approval gate
- Currently rejection stops the pipeline — this keeps it alive

### 7. Re-entry Controller

Resume from any stage via `job_stages` status check:
- `brief_intake` → `hook_query` → `content_generation` → `image_generation` → `approval` → `publishing`
- If image generation fails, retry without regenerating content
- If user edits content after approval, re-run only publishing stage

### 8. Tier Router

- **Not applicable** for this pipeline (text-first, no heavy compute tiers)
- Image generation tier: Standard Seedream 5 Lite for all tiers (cost is minimal at ~$0.035/image)
- Content generation: Gemini for all tiers (cost is ~$0.01/batch)

### 9. Assembly Engine

- **Not applicable** — no video content to assemble
- Image generation is single-pass, no multi-asset merge needed

### 10. SEALCaM Prompting

- **Not applicable** — text-first pipeline, no cinematic video prompts
- Image prompts use Image Template Engine's own prompt structure instead

### 11. Brand Voice DNA Integration

Inject `voice_signature.json` from `brand_profiles.voice_profile` into Stage 2 system prompt:
- Prepend `## Brand Voice Context` block before the content generation instructions
- Platform variations auto-applied based on which platform content is being generated for
- Ensures each brand's social content sounds distinctively different
- Tone, vocabulary, emoji policy, and CTA patterns all derived from brand voice profile
- If no voice profile exists → generation proceeds with generic AI tone (graceful degradation)
- See `engines/BRAND_VOICE_DNA_ENGINE.md` for full schema and injection contract

### 12. Template-Driven Image Composer (upgrades Stage 3)

Replace generic DALL-E/Seedream image generation with the `TemplateDrivenImageComposer`:
- Select composition templates matching content type and platform from template library
- Two-pass generation: base scene (Seedream 5.0 Lite) → product fusion (SeedEdit 3.0)
- Support carousel output format for Instagram and LinkedIn (multi-slide)
- See `engines/SOCIAL_CAROUSEL_SCHEMA.md` for carousel slide schema and platform specs
- See `IMAGE_TEMPLATE_ENGINE_DESIGN.md` for Seedream fusion pipeline details

### 13. Provider Routing

All provider calls route through the Provider Routing Layer:
- Image generation: WaveSpeed → OpenAI Images → SDXL (fallback chain)
- Vision analysis: Gemini → GPT-4o Vision (fallback chain)
- See `engines/PROVIDER_ROUTING_POLICY.md` for health-check and failover logic

### 14. Delivery & Post-Production (Module #17)

For image-based social content, Module #17 applies a subset of post-production:
- **Auto-Subtitles**: ✅ (for any video content generated in carousel)
- **Dubbing**: opt (for video posts only)
- **Thumbnails**: ✅ (auto-generated preview images per platform)
- **Watermark**: ✅ (review versions watermarked before client approval)
- **Export**: ✅ (platform-optimized image/video formats per platform spec)
- See `engines/DELIVERY_POST_PRODUCTION_ENGINE.md` for full specification
