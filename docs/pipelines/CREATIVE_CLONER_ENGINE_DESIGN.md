# Creative Cloner Zero-Effort Engine — Design Document

> **Status**: Design phase — not yet implemented
> **Family**: 8 (Creative Cloner)
> **Principle**: Users do zero work. The system thinks ahead so they just pay and get results.

---

## 1. Vision Statement

Users never source or upload reference videos. They onboarded with their brand assets already. When they click "Create Video Ad", the system does everything: selects the best template video from a curated library, analyzes it via SEALCaM, injects their brand/product, generates all assets, assembles the final video. User's only action: click generate, then approve or reject.

---

## 2. Video Template Library

### Database Table: `video_templates`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `title` | text | Internal name ("Luxury Watch Reveal", "Food Product Hero") |
| `video_url` | text | Supabase Storage path to the curated reference video |
| `industry_tags` | text[] | e.g. `{fashion, beauty, luxury}` |
| `mood_tags` | text[] | e.g. `{energetic, minimal, warm}` |
| `pacing` | enum | `slow`, `medium`, `fast` |
| `scene_count` | int | Number of scenes in the video |
| `duration_seconds` | int | Total video length |
| `sealcam_analysis` | jsonb | Pre-computed SEALCaM breakdown (cached from Stage 1) |
| `product_type` | text[] | What kind of product fits: `{physical, digital, service, food, wearable}` |
| `aspect_ratio` | text | `16:9`, `9:16`, `1:1` |
| `platform_fit` | text[] | `{instagram_reels, tiktok, youtube_shorts, youtube_ads, facebook}` |
| `quality_score` | float | Internal quality rating (1-10) |
| `usage_count` | int | How many times selected (for analytics) |
| `is_active` | boolean | Enable/disable without deleting |
| `created_at` | timestamp | When added to library |

### Key Design Decisions

- **Pre-computed SEALCaM analysis**: Every template gets analyzed once when added to the library. This eliminates Stage 1 wait time for users — the system already knows the cinematic structure.
- **Multi-tag arrays**: A single template can match multiple industries and moods, increasing match flexibility.
- **Platform-aware**: Templates tagged by output platform so the system picks the right aspect ratio automatically.

### Initial Library Target

50–100 templates across 10–15 industries, 3 aspect ratios each.

---

## 3. AI Template Selector Agent

An Edge Function (`select-template`) that scores templates against the user's brand profile.

### Inputs

| Input | Source |
|-------|--------|
| `brand_profile` | industry, target_audience, brand_voice, color_palette |
| `brand_assets` | Product images from Brand Kit |
| `content_request` | Platform target, optional mood preference |
| `video_templates[]` | Candidate templates from database (filtered) |

### Scoring Logic (Two-Pass)

**Pass 1 — Database filter (fast):**

```sql
SELECT * FROM video_templates
WHERE industry_tags && ARRAY[brand.industry]
  AND platform_fit @> ARRAY[requested_platform]
  AND is_active = true
ORDER BY quality_score DESC
LIMIT 10;
```

**Pass 2 — AI scoring (Gemini via Lovable AI Gateway):**

The agent receives the top 10 candidates with their `sealcam_analysis` and scores each on:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Industry fit | 0–25 | How well the visual style matches the brand's industry |
| Mood alignment | 0–25 | Does the template's energy match the brand voice |
| Product compatibility | 0–25 | Can the brand's product type be composited into these scenes |
| Audience match | 0–25 | Does the template's style resonate with the target demographic |

**Fallback**: If no template scores above 60/100, the system falls back to a "universal" template category.

### Output

```json
{
  "selected_template_id": "uuid",
  "confidence_score": 82,
  "reasoning": "Clean product reveal structure matches physical product; minimal aesthetic aligns with luxury brand voice"
}
```

---

## 4. Modified Pipeline Flow

The Creative Cloner pipeline changes from 4 stages to 5, but Stage 1 is now instant:

```text
USER CLICKS "GENERATE"
        │
        ▼
┌──────────────────────────┐
│ STAGE 0 — TEMPLATE SELECT│  Edge Function
│ AI scores templates vs   │  Gemini via Lovable AI
│ brand profile            │  ~5-10 seconds
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ STAGE 1 — CACHED ANALYSIS│  Instant (pre-computed)
│ Load SEALCaM from        │  Read from video_templates
│ template record          │  .sealcam_analysis
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ STAGE 2 — PROMPT GEN     │  Edge Function
│ Inject brand assets into │  Gemini via Lovable AI
│ SEALCaM scene prompts    │  ~10 seconds
└──────────┬───────────────┘
           │
     ┌─────┼──────────┐
     ▼     ▼          ▼
  IMAGES  VIDEOS    MUSIC       ← 3 parallel lanes
  (Kie)  (Kie)     (Kie)       ← All via Kie AI
     │     │          │
     └─────┼──────────┘
           ▼
┌──────────────────────────┐
│ STAGE 4 — ASSEMBLY       │  Python worker
│ FFmpeg concat + music    │  ~30 seconds
│ overlay + fade           │
└──────────────────────────┘
           │
           ▼
     USER REVIEW
```

**Total estimated time**: ~8–12 minutes (down from ~15+ with manual video upload and analysis).

**Note**: Images must complete before videos start (video needs the start frame as input). Music runs in parallel with both.

---

## 5. User Journey

### Step 1 — Dashboard

User sees content type cards. Clicks "Video Ad" or "Recreate Ad Style". Already onboarded with brand assets.

### Step 2 — Configuration (minimal)

- Select platform: Instagram Reels / TikTok / YouTube Shorts / YouTube Ads
- Optional: mood preference (energetic / calm / luxurious / playful) — defaults to brand voice if skipped
- Optional: select specific product from Brand Kit — defaults to primary product
- One click **"Generate"**.

### Step 3 — Generation (progress screen)

Live progress indicator showing:

| Stage | Status Message |
|-------|---------------|
| 0 | "Selecting the perfect ad style for your brand..." |
| 2 | "Crafting your scenes..." |
| 3A/3B | "Generating visuals..." (shows scene thumbnails as they complete) |
| 3C | "Creating soundtrack..." |
| 4 | "Assembling your video..." |

Estimated time remaining displayed.

### Step 4 — Review

- Video player with the finished ad
- Two music variants to choose from
- **Approve** → moves to content calendar / download
- **Reject** → regenerate with different template or tweaked prompts
- **Request changes** → minor prompt adjustments, re-run specific stages

---

## 6. Template Curation Strategy

Templates are added by the Brandflow team (not users). Process:

1. Source high-quality reference ads from stock libraries or create original template videos
2. Run each through SEALCaM analysis (one-time, stored in `sealcam_analysis`)
3. Tag with industry, mood, pacing, product type, platform
4. Quality review and scoring
5. Insert into `video_templates` table

**Over time**: Track `usage_count` and user approval rates per template to identify top performers and retire low-performers.

---

## 7. State Machine Updates

The `generation_jobs` table status enum adds one new state:

```
selecting_template → prompting → generating_images →
generating_video → generating_music → assembling → review → approved / rejected
```

### New metadata fields in `generation_jobs.metadata`

| Field | Type | Purpose |
|-------|------|---------|
| `selected_template_id` | uuid | Which template was chosen |
| `selector_confidence` | float | AI confidence score (0–100) |
| `selector_reasoning` | text | Why this template was picked |

---

## 8. Provider Summary (Corrected from Python Scripts)

Based on the actual R54 Python tools (not the n8n workflow):

| Stage | Provider | Model |
|-------|----------|-------|
| Video Analysis | Google AI SDK (direct) | `gemini-2.0-flash` |
| Prompt Generation | Lovable AI Gateway | `gemini-3-flash-preview` |
| Images | Kie AI | `nano-banana-pro` via `/api/v1/jobs/createTask` |
| Video | Kie AI | `kling-2.6` via `/api/v1/jobs/createTask` |
| Music | Kie AI | Suno V4 via `/api/v1/generate` |
| Assembly | Local FFmpeg | Python worker |

---

## 9. Cross-References

- [`CREATIVE_CLONER_PIPELINE.md`](./CREATIVE_CLONER_PIPELINE.md) — Original pipeline spec (user-uploaded video model)
- [`SEALCAM_FRAMEWORK.md`](./SEALCAM_FRAMEWORK.md) — SEALCaM prompting standard used throughout
- [`CINEMATIC_AD_PIPELINE.md`](./CINEMATIC_AD_PIPELINE.md) — Shares similar generation stages but starts from text, not video
