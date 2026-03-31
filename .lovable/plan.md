

## Hook Library Engine — Performance-Driven Content Intelligence

### The Concept

A curated database of proven social media hooks, captions, and CTAs — scraped from real platforms, annotated by industry, platform, and performance signals. Every content generation call (Social Content, Ad Creator, Video captions) queries this library FIRST to ground its output in what actually works, rather than generating from scratch.

### How It Works

```text
SCRAPING LAYER (Firecrawl + manual curation)
  │
  ▼
┌─────────────────────────────────┐
│ HOOK LIBRARY (Supabase)         │
│ hooks table                     │
│ - content, platform, industry   │
│ - hook_type, engagement_tier    │
│ - performance_signals           │
└──────────┬──────────────────────┘
           │
           ▼  (queried before every generation)
┌─────────────────────────────────┐
│ CONTENT GENERATION ENGINE       │
│ "Here are 5 top-performing      │
│  hooks in {industry} on         │
│  {platform}. Generate content   │
│  that follows these patterns."  │
└─────────────────────────────────┘
```

### Database: `hooks` Table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `content` | text | The actual hook/caption text |
| `platform` | text | `instagram`, `tiktok`, `linkedin`, `x`, `facebook`, `threads`, `youtube` |
| `industry_tags` | text[] | `{beauty, skincare, fashion, food, tech, fitness, saas}` |
| `hook_type` | text | `question`, `statistic`, `controversy`, `story`, `listicle`, `how_to`, `before_after`, `social_proof`, `urgency`, `curiosity_gap` |
| `content_format` | text | `caption`, `hook_line`, `cta`, `thread_opener`, `video_script_hook` |
| `engagement_tier` | text | `viral`, `high`, `medium`, `baseline` — based on performance signals |
| `performance_signals` | jsonb | `{likes: 12000, comments: 450, shares: 800, saves: 2100, views: 500000}` |
| `source_url` | text | Where it was scraped from (for attribution/reference) |
| `language` | text | `en`, `es`, `fr`, etc. |
| `tone` | text | `professional`, `casual`, `witty`, `inspirational`, `educational` |
| `word_count` | int | For length-based filtering |
| `has_emoji` | boolean | Style signal |
| `has_hashtags` | boolean | Style signal |
| `scraped_at` | timestamp | When collected |
| `is_active` | boolean | Enable/disable |

### Scraping Pipeline

Use **Firecrawl** (already available as a connector) to scrape content sources. An Edge Function processes raw scrapes and annotates them:

1. **Scrape** — Firecrawl collects posts from industry blogs, social media aggregator sites, viral content databases
2. **Annotate** — Gemini via Lovable AI Gateway classifies each hook: `hook_type`, `tone`, `industry_tags`, `engagement_tier`
3. **Store** — Insert annotated hooks into the `hooks` table
4. **Refresh** — Scheduled scraping (weekly/monthly) to keep the library current

### Query Integration — How Generation Uses Hooks

Every content generation call gets a new pre-step. Before the AI writes anything, an Edge Function queries the hooks table:

```sql
SELECT content, hook_type, engagement_tier, performance_signals
FROM hooks
WHERE platform = $1
  AND industry_tags && $2
  AND engagement_tier IN ('viral', 'high')
  AND is_active = true
ORDER BY
  CASE engagement_tier
    WHEN 'viral' THEN 1
    WHEN 'high' THEN 2
  END,
  random()
LIMIT 5;
```

These 5 hooks are injected into the generation prompt as few-shot examples:

```text
"Before writing, study these top-performing hooks in {industry} on {platform}:

1. [viral] "Did you know 90% of skincare routines are missing this one step?"
2. [viral] "I spent $500 on products before discovering this $12 solution"
3. [high]  "Your morning routine is sabotaging your skin. Here's why →"
4. [high]  "3 ingredients dermatologists actually recommend (not what you think)"
5. [high]  "POV: You finally found a routine that works"

Generate content that follows these proven patterns — same energy, similar structure,
but original content for {brand_name}'s {product}."
```

### Which Pipelines Use This

| Pipeline | How Hooks Are Used |
|----------|--------------------|
| **F4 Social Content** | Hook examples injected into the 7-platform generation prompt |
| **F7 Ad Creator** | Hook patterns inform the Creative Director's caption generation |
| **F1 UGC** | Video script hooks drawn from `video_script_hook` format |
| **F2 AI Spokesperson** | Opening lines pulled from high-performing hooks |
| **F5 Cinematic Ad** | Caption/tagline generation uses hook patterns |
| **Image Template Engine** | Headline text suggestions based on hooks |

### User's Content History Layer

Beyond the global hook library, the system also tracks what has worked for THIS specific user/brand:

**`brand_content_history` table:**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `brand_id` | uuid | FK to brand_profiles |
| `content` | text | The generated content that was published |
| `platform` | text | Where it was posted |
| `hook_type` | text | What pattern was used |
| `published_at` | timestamp | When posted |
| `performance` | jsonb | Actual engagement metrics (if connected to social APIs) |
| `was_approved` | boolean | Did the user approve it on first try |

This creates a feedback loop: the system learns which hook types perform best for THIS brand and weights future suggestions accordingly.

### Generation Priority Order

When the content engine generates, it queries in this order:

1. **Brand history** — What hooks have worked for this specific brand (highest priority)
2. **Industry hooks** — Top performers in the brand's industry
3. **Platform hooks** — General top performers on the target platform
4. **Fallback** — Generate without examples (only if library is empty for this combination)

### Files to Create

1. **`docs/pipelines/HOOK_LIBRARY_ENGINE_DESIGN.md`** — Full design doc with all sections above

### Technical Details

- Firecrawl connector handles scraping (already available)
- Gemini via Lovable AI Gateway handles annotation/classification
- PostgreSQL array operators (`&&`, `@>`) handle multi-tag filtering efficiently
- GIN indexes on `industry_tags` and `platform` for fast queries
- The hook injection adds ~200 tokens to each generation prompt — negligible cost
- Scheduled Supabase cron or Edge Function for periodic scraping refresh

