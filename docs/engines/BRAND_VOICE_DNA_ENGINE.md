# Brand Voice DNA Engine — Technical Reference

> **Status**: Design reference — not yet implemented  
> **Owner**: Cross-family shared module  
> **Purpose**: Extract, store, and inject a brand's unique voice signature into every content generation call

---

## Overview

Without a Brand Voice DNA layer, all brands using Brandflow converge to the same generic AI tone — professional but indistinguishable. This engine extracts a unique `voice_signature.json` from brand inputs and injects it as a `## Brand Voice Context` block into every content generation prompt across all families.

**Core principle**: Every brand should sound different. The AI should write like the brand, not like an AI.

---

## Architecture

```text
Brand Onboarding Inputs
  ├─ Brand description (text)
  ├─ Existing posts (URLs or text, optional)
  ├─ Tone sliders (formal↔casual, serious↔playful, etc.)
  ├─ Industry
  ├─ Target audience
  └─ Value propositions

  → Extraction Pipeline
      ├─ Firecrawl scrape existing posts/website (if URLs provided)
      ├─ Gemini analysis (via Lovable AI Gateway)
      └─ Output: voice_signature.json

  → Storage: brand_profiles.voice_profile (JSONB column)

  → Injection: Prepended to every content generation prompt as:
      ## Brand Voice Context
      <voice_signature contents>
```

---

## Voice Signature Schema

```json
{
  "voice_signature_version": "1.0",
  "tone_profile": {
    "formality": 0.3,
    "humor": 0.6,
    "enthusiasm": 0.8,
    "authority": 0.5,
    "warmth": 0.7,
    "urgency": 0.4,
    "primary_tone": "friendly expert",
    "tone_keywords": ["approachable", "knowledgeable", "enthusiastic"]
  },
  "sentence_structure_profile": {
    "avg_sentence_length": "short",
    "preferred_structures": ["question-then-answer", "bold-claim-then-proof"],
    "paragraph_style": "punchy",
    "uses_fragments": true,
    "uses_lists": true
  },
  "lexical_bias": {
    "preferred_words": ["transform", "unlock", "discover"],
    "avoided_words": ["synergy", "leverage", "disrupt"],
    "industry_jargon_level": "moderate",
    "reading_level": "grade_8"
  },
  "cta_patterns": {
    "preferred_ctas": ["Try it free", "See the difference", "Start today"],
    "cta_style": "soft_push",
    "cta_frequency": "every_post"
  },
  "hook_preferences": {
    "preferred_hook_types": ["question", "bold_claim", "story_opener"],
    "avoided_hook_types": ["clickbait", "fear_based"],
    "hook_length": "short"
  },
  "emoji_policy": {
    "usage": "moderate",
    "max_per_post": 3,
    "preferred_emojis": ["✨", "🎯", "💡"],
    "placement": "inline_and_end"
  },
  "platform_variations": {
    "linkedin": {
      "tone_override": "slightly_more_formal",
      "emoji_usage": "minimal",
      "hashtag_count": "3-5"
    },
    "instagram": {
      "tone_override": "more_casual",
      "emoji_usage": "generous",
      "hashtag_count": "10-15"
    },
    "twitter": {
      "tone_override": "punchy",
      "emoji_usage": "minimal",
      "max_length": 280
    },
    "tiktok": {
      "tone_override": "conversational",
      "emoji_usage": "moderate",
      "style": "gen_z_friendly"
    }
  }
}
```

---

## Extraction Pipeline

### Step 1: Gather Inputs

During brand onboarding, collect:

| Input | Type | Required | Purpose |
|-------|------|----------|---------|
| `brand_description` | string | Yes | Core identity statement |
| `existing_post_urls` | URL[] | No | Firecrawl scrapes for voice analysis |
| `existing_post_text` | string[] | No | Direct text samples |
| `tone_sliders` | object | No | Manual tone calibration |
| `industry` | string | Yes | Industry-specific vocabulary |
| `target_audience` | string | Yes | Audience-appropriate language |
| `value_propositions` | string[] | No | Key messages to reinforce |

### Step 2: Scrape Existing Content (Optional)

If `existing_post_urls` provided:
- Firecrawl scrapes each URL (format: `markdown`)
- Extract social media posts, blog content, website copy
- Aggregate into a text corpus for analysis

### Step 3: Gemini Analysis

**Provider**: Gemini via Lovable AI Gateway

**System Prompt**:
```
Analyze the following brand content and extract a voice signature profile.

Brand Description: {{brand_description}}
Industry: {{industry}}
Target Audience: {{target_audience}}
Existing Content Samples:
{{content_samples}}

Tone Slider Inputs (if provided):
{{tone_sliders}}

Output a JSON object matching the voice_signature schema with:
- tone_profile: Analyze emotional tone, formality, humor level
- sentence_structure_profile: How do they write? Short punchy? Long flowing?
- lexical_bias: What words do they favor? Avoid? Jargon level?
- cta_patterns: How do they ask for action?
- hook_preferences: How do they open content?
- emoji_policy: How do they use emojis?
- platform_variations: How does voice shift per platform?

Be specific. Don't output generic profiles. Derive everything from the actual content.
```

### Step 4: Store

Store the output as `brand_profiles.voice_profile` (JSONB column in Supabase).

---

## Injection Contract

Every content generation prompt across all families gets a prepended block:

```
## Brand Voice Context

Tone: {{tone_profile.primary_tone}} ({{tone_keywords joined}})
Formality: {{formality}}/1.0 | Humor: {{humor}}/1.0 | Warmth: {{warmth}}/1.0
Sentence style: {{sentence_structure_profile.paragraph_style}}, avg {{avg_sentence_length}}
Vocabulary: Prefer [{{preferred_words}}], avoid [{{avoided_words}}]
CTA style: {{cta_style}} — examples: {{preferred_ctas}}
Hook style: {{preferred_hook_types joined}}
Emojis: {{emoji_policy.usage}}, max {{max_per_post}} per post
Platform: {{current_platform}} — {{platform_variations[current_platform]}}

IMPORTANT: Match this brand's voice exactly. Do not default to generic AI tone.
```

This block adds ~200 tokens to each generation prompt — negligible cost impact.

---

## Cross-Family Integration Points

| Family | Injection Point | Purpose |
|--------|----------------|---------|
| F4 Social Content | Stage 2 system prompt | Platform-specific caption tone |
| F5 Cinematic Ad | Stage 3 script generation | Ad script voice matching |
| F7 Ad Creator | Stage 3 Creative Director agent | Caption and creative summary tone |
| F8 Creative Cloner | Stage 2 prompt generation | Recreated ad narrative voice |
| F2 AI Spokesperson | Stage 3 script enhancement | Spokesperson script tone |
| F1 UGC | Stage 3 scene planning (dialogue) | UGC dialogue voice matching |

---

## Refresh & Update

- **Manual refresh**: User can re-run extraction after updating brand content
- **Auto-refresh**: When user uploads new content samples, offer to re-analyze
- **Version tracking**: Store `voice_signature_version` for backward compatibility
- **A/B testing**: Allow brands to test multiple voice profiles and track engagement per profile

---

## Database Schema

```sql
-- Add to existing brand_profiles table
ALTER TABLE brand_profiles ADD COLUMN voice_profile JSONB DEFAULT NULL;

-- Index for fast retrieval during generation
CREATE INDEX idx_brand_profiles_voice ON brand_profiles USING GIN (voice_profile);
```

---

## Key Design Notes

1. **Not a prompt template** — this is a structured data object that gets injected into prompts
2. **Platform-aware** — the injection adapts based on which platform content is being generated for
3. **Derived from real content** — when existing posts are provided, the voice is extracted, not invented
4. **Slider override** — manual tone sliders can override extracted values for fine-tuning
5. **Graceful degradation** — if no voice profile exists, generation proceeds without it (generic AI tone)
