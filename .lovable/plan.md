

## Creative Cloner Zero-Effort Engine — Design Document

This will be saved as `docs/pipelines/CREATIVE_CLONER_ENGINE_DESIGN.md` — a comprehensive design doc covering the template library, AI selector agent, and user journey for the zero-effort Creative Cloner.

### File to Create

**`docs/pipelines/CREATIVE_CLONER_ENGINE_DESIGN.md`**

Contents:

---

**1. Vision Statement**

Users never source or upload reference videos. They onboarded with their brand assets already. When they click "Create Video Ad", the system does everything: selects the best template video from a curated library, analyzes it via SEALCaM, injects their brand/product, generates all assets, assembles the final video. User's only action: click generate, then approve or reject.

---

**2. Video Template Library**

Database table: `video_templates`

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| title | text | Internal name ("Luxury Watch Reveal", "Food Product Hero") |
| video_url | text | Supabase Storage path to the curated reference video |
| industry_tags | text[] | e.g. `{fashion, beauty, luxury}` |
| mood_tags | text[] | e.g. `{energetic, minimal, warm}` |
| pacing | enum | `slow`, `medium`, `fast` |
| scene_count | int | Number of scenes in the video |
| duration_seconds | int | Total video length |
| sealcam_analysis | jsonb | Pre-computed SEALCaM breakdown (cached from Stage 1) |
| product_type | text[] | What kind of product fits: `{physical, digital, service, food, wearable}` |
| aspect_ratio | text | `16:9`, `9:16`, `1:1` |
| platform_fit | text[] | `{instagram_reels, tiktok, youtube_shorts, youtube_ads, facebook}` |
| quality_score | float | Internal quality rating (1-10) |
| usage_count | int | How many times selected (for analytics) |
| is_active | boolean | Enable/disable without deleting |
| created_at | timestamp | When added to library |

Key design decisions:
- **Pre-computed SEALCaM analysis**: Every template gets analyzed once when added to the library. This eliminates Stage 1 wait time for users — the system already knows the cinematic structure.
- **Multi-tag arrays**: A single template can match multiple industries and moods, increasing match flexibility.
- **Platform-aware**: Templates tagged by output platform so the system picks the right aspect ratio automatically.

Initial library target: 50-100 templates across 10-15 industries, 3 aspect ratios each.

---

**3. AI Template Selector Agent**

An Edge Function (`select-template`) that scores templates against the user's brand profile.

**Inputs to the agent:**
- `brand_profile`: industry, target_audience, brand_voice, color_palette
- `brand_assets`: product images (from Brand Kit)
- `content_request`: what platform they're creating for, any mood preference
- `video_templates[]`: candidate templates from database (filtered by industry + platform)

**Scoring logic (two-pass):**

*Pass 1 — Database filter (fast):*
```sql
SELECT * FROM video_templates
WHERE industry_tags && ARRAY[brand.industry]
  AND platform_fit @> ARRAY[requested_platform]
  AND is_active = true
ORDER BY quality_score DESC
LIMIT 10;
```

*Pass 2 — AI scoring (Gemini via Lovable AI Gateway):*
The agent receives the top 10 candidates with their `sealcam_analysis` and scores each on:
- **Industry fit** (0-25): How well the visual style matches the brand's industry
- **Mood alignment** (0-25): Does the template's energy match the brand voice
- **Product compatibility** (0-25): Can the brand's product type be composited into these scenes
- **Audience match** (0-25): Does the template's style resonate with the target demographic

Returns the top-scoring template ID. If no template scores above 60/100, the system falls back to a "universal" template category.

**Output:**
```json
{
  "selected_template_id": "uuid",
  "confidence_score": 82,
  "reasoning": "Clean product reveal structure matches physical product; minimal aesthetic aligns with luxury brand voice"
}
```

---

**4. Modified Pipeline Flow**

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

Total estimated time: ~8-12 minutes (down from ~15+ with manual video upload and analysis).

---

**5. User Journey (What They See)**

**Step 1 — Dashboard** (already onboarded with brand assets)
- User sees content type cards. Clicks "Video Ad" or "Recreate Ad Style".

**Step 2 — Configuration (minimal)**
- Select platform: Instagram Reels / TikTok / YouTube Shorts / YouTube Ads
- Optional: mood preference (energetic / calm / luxurious / playful) — defaults to brand voice if skipped
- Optional: select specific product from Brand Kit — defaults to primary product
- That's it. One click "Generate".

**Step 3 — Generation (progress screen)**
- Live progress indicator showing:
  - "Selecting the perfect ad style for your brand..." (Stage 0)
  - "Crafting your scenes..." (Stage 2)
  - "Generating visuals..." (Stage 3A/3B, shows scene thumbnails as they complete)
  - "Creating soundtrack..." (Stage 3C)
  - "Assembling your video..." (Stage 4)
- Estimated time remaining displayed.

**Step 4 — Review**
- Video player with the finished ad
- Two music variants to choose from
- Approve → moves to content calendar / download
- Reject → regenerate with different template or tweaked prompts
- Request changes → minor prompt adjustments, re-run specific stages

---

**6. Template Curation Strategy**

Templates are added by Brandflow team (not users). Process:
1. Source high-quality reference ads from stock libraries or create original template videos
2. Run each through SEALCaM analysis (one-time, stored in `sealcam_analysis`)
3. Tag with industry, mood, pacing, product type, platform
4. Quality review and scoring
5. Insert into `video_templates` table

Over time: track `usage_count` and user approval rates per template to identify top performers and retire low-performers.

---

**7. State Machine Updates**

The `generation_jobs` table status enum adds one new state:

```
selecting_template → prompting → generating_images →
generating_video → generating_music → assembling → review → approved/rejected
```

New metadata fields in `generation_jobs.metadata`:
- `selected_template_id`: which template was chosen
- `selector_confidence`: AI confidence score
- `selector_reasoning`: why this template was picked

---

**8. Provider Corrections from Python Scripts**

Based on the actual R54 Python tools (not the n8n workflow):

| Stage | Correct Provider | Correct Model |
|-------|-----------------|---------------|
| Video Analysis | Google AI SDK (direct) | `gemini-2.0-flash` |
| Prompt Generation | Lovable AI Gateway | `gemini-3-flash-preview` (Brandflow) |
| Images | Kie AI | `nano-banana-pro` via `/api/v1/jobs/createTask` |
| Video | Kie AI | `kling-2.6` via `/api/v1/jobs/createTask` |
| Music | Kie AI | Suno V4 via `/api/v1/generate` |
| Assembly | Local FFmpeg | Python worker |

### Steps

1. Create `docs/pipelines/CREATIVE_CLONER_ENGINE_DESIGN.md` with all sections above
2. No code changes — design doc only

