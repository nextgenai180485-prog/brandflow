# Localization & Cultural Adaptation Engine — Module #18

> **Status**: Design reference — not yet implemented  
> **Owner**: Cross-family shared module  
> **Purpose**: Translate, adapt, and culturally localize all generated content — copy, scripts, captions, subtitles, imagery cues, and tone — for target markets  
> **Principle**: Localization is not translation. It adapts humor, metaphors, color psychology, imagery norms, text direction, and cultural taboos per market.

---

## Overview

Brandflow serves global brands. A cinematic ad that works in the US may fail in Japan, Saudi Arabia, or Brazil — not because of language, but because of cultural context. Module #18 handles both linguistic translation AND cultural adaptation as a unified engine.

```text
Generated Content (any family output)
  │
  ▼
┌──────────────────────────────────────────────┐
│  #18 — Localization & Cultural Adaptation    │
│                                              │
│  1. Text Translation (copy, scripts, CTAs)   │
│  2. Subtitle Translation & Timing            │
│  3. Voice Dubbing Coordination               │
│  4. Cultural Adaptation Rules                 │
│  5. Visual Adaptation Signals                 │
│  6. RTL / Script-Aware Layout                 │
│  7. Market-Specific Compliance               │
│                                              │
└──────────────────────────────────────────────┘
  │
  ▼
Localized variant per target market
  ├── Translated text + culturally adapted copy
  ├── Dubbed audio (via Module #17 / ElevenLabs)
  ├── Localized subtitles (SRT/VTT per language)
  ├── Visual adaptation notes (imagery flags)
  └── Market metadata (locale, compliance, direction)
```

---

## Architecture

### When Does Localization Run?

Localization is an **optional post-production step** triggered when the user selects target markets at Brief Intake or post-approval.

```text
Pipeline Flow:
  Brief Intake (target_markets[] selected)
    → ... normal pipeline ...
    → Assembly (#8)
    → Post-Production (#17)
    → Localization (#18)  ← runs per target market
    → Delivery (localized variants)
```

If no target markets are selected, Module #18 is skipped entirely.

### Integration with Module #17

Module #18 coordinates closely with Delivery & Post-Production (#17):

| Capability | #17 Responsibility | #18 Responsibility |
|------------|-------------------|-------------------|
| Subtitles | Generate source-language SRT | Translate SRT per target language |
| Dubbing | ElevenLabs Dubbing API execution | Select target languages, provide cultural tone guidance |
| Audio Polish | Master audio levels | Ensure dubbed audio matches mastering spec |
| Thumbnails | Generate from source | Flag imagery that needs cultural adaptation |

---

## Capability Specifications

### 1. Text Translation

| Field | Value |
|-------|-------|
| **Scope** | Ad copy, scripts, CTAs, captions, social post text, hook text |
| **Primary** | Lovable AI Gateway (Gemini) with cultural context prompt |
| **Fallback** | DeepL API → Google Cloud Translation |
| **Approach** | AI translation with brand voice preservation — NOT raw machine translation |
| **Brand Voice** | Inject `voice_signature.json` (#12) translated tone descriptors per locale |
| **Glossary** | Per-brand glossary of terms that must NOT be translated (product names, taglines) |

**Translation Prompt Strategy**:
```text
Translate the following ad copy from {source_language} to {target_language}.

Context:
- Brand: {brand_name}
- Industry: {industry}
- Target market: {market} ({country})
- Brand voice: {voice_signature_summary}
- Cultural note: {cultural_adaptation_rule}

Do NOT translate these terms: {glossary_protected_terms}

Adapt idioms, humor, and metaphors to feel natural in {target_language}.
Maintain the emotional impact and CTA urgency of the original.
```

### 2. Subtitle Translation & Timing

| Field | Value |
|-------|-------|
| **Input** | Source SRT/VTT from Module #17 |
| **Process** | Translate text → adjust timing for text expansion (e.g., German ~30% longer than English) |
| **Output** | Localized SRT/VTT per target language |
| **Text expansion handling** | Auto-adjust subtitle duration, split long lines, reduce font size if needed |

### 3. Voice Dubbing Coordination

| Field | Value |
|-------|-------|
| **Provider** | ElevenLabs Dubbing API (via Module #17) |
| **Role of #18** | Select target languages, provide pronunciation guides, cultural tone notes |
| **Voice matching** | Preserve original speaker characteristics across languages |
| **Quality gate** | AI-verify lip-sync alignment post-dubbing for F2 Spokesperson |

### 4. Cultural Adaptation Rules

This is what separates enterprise localization from basic translation. Each target market has a **cultural profile** that modifies content generation:

```json
{
  "market_id": "sa_ar",
  "locale": "ar-SA",
  "display_name": "Saudi Arabia (Arabic)",
  "text_direction": "rtl",
  "cultural_rules": {
    "imagery": {
      "avoid": ["alcohol", "pork products", "exposed skin", "religious symbols of other faiths"],
      "prefer": ["family settings", "modest dress", "desert/urban landscapes", "gold/green accents"],
      "flag_for_review": ["mixed-gender casual settings", "music-heavy content"]
    },
    "tone": {
      "formality": "high",
      "humor_style": "subtle, wordplay preferred over slapstick",
      "cta_style": "respectful invitation over aggressive urgency",
      "honorifics": true
    },
    "color_psychology": {
      "positive": ["green", "gold", "white", "blue"],
      "negative": ["yellow (caution context)"],
      "neutral": ["black", "grey"]
    },
    "calendar": {
      "avoid_dates": ["Ramadan (context-dependent)", "Hajj season"],
      "peak_dates": ["Eid al-Fitr", "Saudi National Day (Sept 23)", "Riyadh Season"]
    },
    "legal": {
      "disclaimer_required": true,
      "disclaimer_text": "...",
      "age_restriction_display": true
    }
  }
}
```

**Pre-built Market Profiles** (launch set):

| Market | Locale | Direction | Key Adaptations |
|--------|--------|-----------|-----------------|
| US English | en-US | LTR | Baseline — no adaptation needed |
| UK English | en-GB | LTR | Spelling, date format, cultural references |
| Arabic (Saudi) | ar-SA | RTL | Imagery modesty, formal tone, green/gold palette |
| Arabic (UAE) | ar-AE | RTL | More cosmopolitan than SA, luxury positioning |
| French | fr-FR | LTR | Formal vous, cultural food/fashion sensitivity |
| German | de-DE | LTR | 30% text expansion, precision-focused copy |
| Japanese | ja-JP | LTR/TTB | Honorific system, indirect CTAs, kawaii vs formal |
| Brazilian Portuguese | pt-BR | LTR | Informal warmth, carnival energy, social-first |
| Hindi | hi-IN | LTR | Festival-aware, family-centric imagery |
| Spanish (LATAM) | es-419 | LTR | Varies by country — avoid Spain-specific idioms |
| Mandarin (China) | zh-CN | LTR | WeChat/Douyin formatting, red/gold positive |
| Korean | ko-KR | LTR | K-beauty aesthetics, respect hierarchy |

### 5. Visual Adaptation Signals

Module #18 does NOT regenerate images — it produces **adaptation signals** that flag content for the Creative Director Agent (#1) or human review:

```json
{
  "visual_flags": [
    {
      "scene": 2,
      "issue": "Scene contains wine glass — flagged for ar-SA market",
      "severity": "block",
      "recommendation": "Replace with tea/coffee or remove scene"
    },
    {
      "scene": 4,
      "issue": "Text overlay in scene — needs RTL layout for ar-SA",
      "severity": "adapt",
      "recommendation": "Mirror text position, use Arabic font"
    }
  ]
}
```

**Severity levels**:
- `block` — content CANNOT be used in this market without changes
- `adapt` — content needs modification but is fundamentally acceptable
- `review` — human should verify cultural appropriateness

### 6. RTL / Script-Aware Layout

| Feature | Implementation |
|---------|---------------|
| Text direction | Auto-detect RTL languages (Arabic, Hebrew, Urdu, Farsi) |
| Subtitle positioning | Flip alignment for RTL |
| Text-on-video overlays | Mirror layout, RTL-safe fonts |
| Carousel order | Reverse slide order for RTL markets |
| Number formatting | Arabic-Indic numerals (٠١٢) vs Western Arabic (012) — configurable |

### 7. Market-Specific Compliance

| Market | Compliance Requirement |
|--------|----------------------|
| EU | GDPR disclaimers, cookie consent in ads |
| Saudi Arabia | CITC advertising regulations |
| China | CAC content rules, no VPN-dependent media |
| US (Pharma) | FDA fair balance requirements |
| US (Finance) | FINRA advertising rules |
| Australia | ACMA advertising standards |

Compliance rules are stored as market profiles and injected as constraints into the Creative Director Agent prompt.

---

## Localization Job Schema

```json
{
  "localization_job": {
    "id": "uuid",
    "parent_job_id": "uuid (original generation job)",
    "source_locale": "en-US",
    "target_markets": [
      {
        "market_id": "sa_ar",
        "locale": "ar-SA",
        "status": "pending | translating | adapting | reviewing | complete",
        "translations": {
          "copy": { "original": "...", "translated": "...", "adapted": "..." },
          "script": { "original": "...", "translated": "...", "adapted": "..." },
          "cta": { "original": "...", "translated": "...", "adapted": "..." },
          "subtitles": { "srt_url": "https://...", "language": "ar" }
        },
        "visual_flags": [],
        "dubbed_audio_url": "https://...",
        "compliance_check": { "passed": true, "notes": [] },
        "cultural_review": { "status": "auto_approved | needs_human_review", "reviewer": null }
      }
    ]
  }
}
```

---

## Provider Strategy

| Capability | Primary | Fallback 1 | Fallback 2 |
|------------|---------|------------|------------|
| Text translation | Lovable AI Gateway (Gemini — cultural context prompt) | DeepL API | Google Cloud Translation |
| Subtitle translation | Lovable AI Gateway (with timing adjustment) | DeepL + FFmpeg timing | Manual SRT upload |
| Dubbing | ElevenLabs Dubbing API (via #17) | BytePlus VOD TTS | Manual voiceover upload |
| Cultural rule engine | Lovable AI Gateway (market profile + content analysis) | — | Manual review |
| Visual flag detection | Lovable AI Gateway (Gemini Vision — cultural scan) | GPT-4o Vision | Manual review |
| RTL layout | FFmpeg text filters + CSS direction | — | — |

---

## Integration with Existing Modules

| Module | Integration |
|--------|-------------|
| #1 Creative Director Agent | Receives cultural constraints per target market in system prompt |
| #2 Plan Review Gate | Localized variants shown for per-market approval |
| #3 Revision Agent | Cultural rejection feedback loops back with market context |
| #9 Provider & Tier Routing | Routes translation/dubbing to appropriate provider |
| #12 Brand Voice DNA | Voice signature adapted per locale (formal/informal variants) |
| #17 Delivery & Post-Production | Subtitle translation, dubbing coordination, export per locale |

---

## Cross-Family Adoption

| Family | Text | Subtitles | Dubbing | Visual Flags | RTL | Compliance |
|--------|------|-----------|---------|-------------|-----|------------|
| F1 UGC | ✅ | ✅ | opt | ✅ | ✅ | opt |
| F2 Spokesperson | ✅ | ✅ | ✅ | ✅ | ✅ | opt |
| F3 Product Video | ✅ | opt | opt | ✅ | ✅ | opt |
| F4 Social Content | ✅ | opt | — | ✅ | ✅ | ✅ |
| F5 Cinematic Ad | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F7 Ad Creator | ✅ | ✅ | opt | ✅ | ✅ | opt |
| F8 Creative Cloner | ✅ | ✅ | opt | ✅ | ✅ | opt |

**Legend**: ✅ = active by default when market selected, opt = user-selectable, — = not applicable

---

## Database Schema

```sql
CREATE TABLE market_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL,
  display_name TEXT NOT NULL,
  text_direction TEXT DEFAULT 'ltr',
  cultural_rules JSONB DEFAULT '{}',
  compliance_rules JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE brand_glossaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  term TEXT NOT NULL,
  do_not_translate BOOLEAN DEFAULT true,
  preferred_translations JSONB DEFAULT '{}', -- { "ar": "...", "ja": "..." }
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE localization_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  source_locale TEXT DEFAULT 'en-US',
  target_market_id TEXT REFERENCES market_profiles(market_id),
  status TEXT DEFAULT 'pending',
  translations JSONB DEFAULT '{}',
  visual_flags JSONB DEFAULT '[]',
  dubbed_audio_url TEXT,
  compliance_check JSONB DEFAULT '{}',
  cultural_review_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Build Order

Module #18 belongs to **Phase E — Localization**, after Delivery:

```
Phase E — Localization (post-delivery)
  └── 18. Localization & Cultural Adaptation Engine
       ├── Depends on: #17 Delivery & Post-Production (subtitles, dubbing)
       ├── Depends on: #12 Brand Voice DNA (locale-adapted voice)
       ├── Depends on: #9 Provider & Tier Routing (translation provider selection)
       ├── Depends on: #1 Creative Director Agent (cultural constraints injection)
       └── Depends on: #2 Plan Review Gate (per-market approval)
```
