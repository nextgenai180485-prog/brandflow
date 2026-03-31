# Hook Library Engine — Performance-Driven Content Intelligence

> **Status**: Design reference — not yet implemented  
> **Dependencies**: Firecrawl connector, Lovable AI Gateway (Gemini), Supabase  
> **Used by**: F1 UGC, F2 AI Spokesperson, F4 Social Content, F5 Cinematic Ad, F7 Ad Creator, Image Template Engine

---

## Vision

A curated database of proven social media hooks, captions, and CTAs — scraped from real platforms, annotated by industry, platform, and performance signals. Every content generation call queries this library FIRST to ground its output in what actually works, rather than generating from scratch.

**Core principle**: Don't generate content in a vacuum. Study what's working in the user's industry, on their target platform, and use those patterns as creative fuel.

---

## Architecture

```text
SCRAPING LAYER (Firecrawl + manual curation)
  │
  ▼
┌─────────────────────────────────┐
│ ANNOTATION ENGINE               │
│ Gemini via Lovable AI Gateway   │
│ Classifies: hook_type, tone,    │
│ industry_tags, engagement_tier  │
└──────────┬──────────────────────┘
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

---

## Database Schema

### `hooks` Table

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
| `is_active` | boolean | Enable/disable individual hooks |

**Indexes**:
- GIN index on `industry_tags` for array overlap queries (`&&`)
- B-tree index on `platform`
- B-tree index on `engagement_tier`
- Composite index on `(platform, engagement_tier, is_active)`

### `brand_content_history` Table

Tracks what has worked for a specific user/brand — creates a feedback loop.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `brand_id` | uuid | FK to `brand_profiles` |
| `content` | text | The generated content that was published |
| `platform` | text | Where it was posted |
| `hook_type` | text | What pattern was used |
| `published_at` | timestamp | When posted |
| `performance` | jsonb | Actual engagement metrics (if connected to social APIs) |
| `was_approved` | boolean | Did the user approve it on first try |

---

## Scraping Pipeline

### Data Sources

1. **Industry blogs and aggregator sites** — Firecrawl scrapes viral content roundups, "best performing posts" articles
2. **Social media analysis sites** — Sites that curate top-performing content by category
3. **Manual curation** — Team can manually add hooks with known performance data
4. **User-contributed** — Users can optionally share their top-performing content back into the library (anonymized)

### Pipeline Stages

1. **Scrape** — Firecrawl collects posts from configured content sources
2. **Extract** — Parse raw HTML/markdown to isolate individual hooks, captions, CTAs
3. **Annotate** — Gemini via Lovable AI Gateway classifies each hook:
   - `hook_type` (question, statistic, story, etc.)
   - `tone` (professional, casual, witty, etc.)
   - `industry_tags` (beauty, tech, fitness, etc.)
   - `engagement_tier` (viral, high, medium, baseline)
   - `content_format` (caption, hook_line, cta, etc.)
4. **Deduplicate** — Check for near-duplicate hooks before insertion
5. **Store** — Insert annotated hooks into the `hooks` table
6. **Refresh** — Scheduled scraping (weekly/monthly) to keep the library current

### Annotation Prompt (Gemini)

```text
Classify this social media content. Return structured JSON:

Content: "{raw_content}"
Platform: "{platform}"

Return:
{
  "hook_type": one of [question, statistic, controversy, story, listicle, how_to, before_after, social_proof, urgency, curiosity_gap],
  "content_format": one of [caption, hook_line, cta, thread_opener, video_script_hook],
  "industry_tags": array of relevant industries from [beauty, skincare, fashion, food, tech, fitness, saas, finance, health, education, real_estate, ecommerce, travel, automotive],
  "tone": one of [professional, casual, witty, inspirational, educational, provocative, empathetic],
  "engagement_tier": one of [viral, high, medium, baseline] based on the performance signals provided,
  "has_emoji": boolean,
  "has_hashtags": boolean
}
```

---

## Query Integration — How Generation Uses Hooks

### Hook Query Function

Every content generation call gets a pre-step. Before the AI writes anything, an Edge Function queries the hooks table:

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

### Prompt Injection Format

The 5 retrieved hooks are injected into the generation prompt as few-shot examples:

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

### Generation Priority Order

When the content engine generates, it queries in this order:

1. **Brand history** — What hooks have worked for this specific brand (highest priority)
2. **Industry hooks** — Top performers in the brand's industry
3. **Platform hooks** — General top performers on the target platform
4. **Fallback** — Generate without examples (only if library is empty for this combination)

---

## Pipeline Integration

| Pipeline | How Hooks Are Used |
|----------|--------------------|
| **F4 Social Content** | Hook examples injected into the 7-platform generation prompt. The AI sees what's working on each platform before writing. |
| **F7 Ad Creator** | Hook patterns inform the Creative Director Agent's caption generation. High-performing CTAs are provided as reference. |
| **F1 UGC** | Video script hooks drawn from `video_script_hook` format. Opening lines follow proven viral patterns. |
| **F2 AI Spokesperson** | Opening lines pulled from high-performing hooks. The spokesperson's script starts with a proven attention-grabber. |
| **F5 Cinematic Ad** | Caption/tagline generation uses hook patterns for the ad's text overlay and description. |
| **Image Template Engine** | Headline text suggestions based on hooks. When users select a template, suggested text comes from proven hooks. |

---

## Technical Details

| Component | Technology | Notes |
|-----------|-----------|-------|
| Scraping | Firecrawl connector | Already available, handles JS rendering |
| Annotation | Gemini via Lovable AI Gateway | `gemini-3-flash-preview` for classification |
| Storage | Supabase PostgreSQL | `hooks` + `brand_content_history` tables |
| Querying | PostgreSQL array operators | `&&` for tag overlap, GIN indexes for speed |
| Scheduling | Supabase cron / Edge Function | Weekly/monthly scraping refresh |

### Performance Considerations

- Hook injection adds ~200 tokens to each generation prompt — negligible cost
- GIN indexes on `industry_tags` ensure sub-millisecond queries even at 100K+ hooks
- Random ordering within tier ensures variety (same brand doesn't see same examples every time)
- `is_active` flag allows instant removal of problematic hooks without deletion

### Scaling Plan

| Library Size | Expected Timeline | Source |
|-------------|-------------------|--------|
| 500 hooks | Launch (seeded manually + initial scrapes) | Manual curation + Firecrawl |
| 5,000 hooks | Month 2-3 | Automated weekly scraping |
| 50,000+ hooks | Month 6+ | Multi-source scraping + user contributions |

---

## Edge Function: `query-hooks`

**Purpose**: Centralized hook retrieval for all pipelines.

**Input**:
```json
{
  "platform": "instagram",
  "industry_tags": ["beauty", "skincare"],
  "brand_id": "uuid (optional)",
  "limit": 5,
  "content_format": "caption (optional)",
  "hook_types": ["question", "social_proof"] // optional filter
}
```

**Output**:
```json
{
  "hooks": [
    {
      "content": "Did you know 90% of skincare routines are missing this one step?",
      "hook_type": "question",
      "engagement_tier": "viral",
      "performance_signals": { "likes": 12000, "shares": 800 }
    }
  ],
  "source": "brand_history | industry | platform | fallback",
  "prompt_fragment": "Before writing, study these top-performing hooks..."
}
```

The `prompt_fragment` field returns a ready-to-inject string for the generation prompt, so calling pipelines don't need to format it themselves.

---

## Feedback Loop

When a user approves content, the system records:
1. Which hooks were used as examples (stored in job metadata)
2. Whether the user approved on first try
3. If connected to social APIs: actual engagement metrics after publishing

Over time, this creates a per-brand preference model:
- "Brand X's audience responds best to `question` hooks on Instagram"
- "Brand Y gets higher engagement with `social_proof` on LinkedIn"
- The query function weights these preferences when selecting examples

---

## Cross-Reference

- **Social Content Pipeline** (`SOCIAL_CONTENT_PIPELINE.md`): Primary consumer — hooks inject into Stage 2 content generation
- **Cross-Family Engine Audit** (`CROSS_FAMILY_ENGINE_AUDIT.md`): Hook Library is shared engine module #11
- **Creative Cloner Engine** (`CREATIVE_CLONER_ENGINE_DESIGN.md`): Video caption generation uses hooks
- **Image Template Engine** (`IMAGE_TEMPLATE_ENGINE_DESIGN.md`): Headline suggestions use hooks
