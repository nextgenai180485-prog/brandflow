
# Phase 3 — Onboarding & Brand Intake Wizard

## Overview
Multi-step onboarding wizard that captures brand identity in under 3 minutes. Users complete it once after signup, then land on the dashboard ready to generate.

---

## Step 1: Database Schema Expansion

Add columns to `profiles` table + create new `brand_assets` table:

**profiles** (new columns):
- `website_url` (text) — business website for future Firecrawl scraping
- `industry` (text) — vertical selector (default: medspa)
- `brand_colors` (jsonb) — primary/secondary/accent hex values
- `brand_voice_tone` (text) — e.g. "Warm & Professional", "Bold & Edgy"
- `brand_voice_keywords` (text[]) — words that define the brand voice
- `target_audience` (text) — ideal customer description
- `onboarding_completed` (boolean, default false) — gates dashboard access
- `onboarding_step` (int, default 0) — tracks wizard progress for resume

**brand_assets** (new table):
- `id` (uuid, PK)
- `profile_id` (uuid, FK → profiles)
- `asset_type` (text) — 'logo' | 'product_photo' | 'brand_photo' | 'style_reference'
- `file_url` (text) — Supabase Storage URL
- `file_name` (text)
- `created_at` (timestamptz)

RLS: Users can only CRUD their own brand_assets.

---

## Step 2: Onboarding Wizard UI (4 Steps)

Route: `/onboarding` — protected, shown after signup if `onboarding_completed = false`.

### Step 1 of 4 — Business Basics
- Business name (pre-filled from signup)
- Website URL (optional)
- Industry dropdown (Medspa pre-selected, with Medical Spa, Dental, Wellness, Fitness, Beauty, Other)
- Target audience textarea

### Step 2 of 4 — Brand Identity
- Brand color picker (primary, secondary, accent) with preset palettes
- Logo upload (to `campaign_assets` bucket)
- Style reference uploads (up to 3 images)

### Step 3 of 4 — Brand Voice
- Tone selector: grid of 6 preset cards (Warm & Professional, Bold & Edgy, Luxurious & Refined, Friendly & Casual, Clinical & Trustworthy, Playful & Fun)
- Brand keywords input (tag-style, up to 10)
- Optional: paste example caption or bio text

### Step 4 of 4 — Review & Launch
- Summary card showing all inputs
- Edit buttons to jump back to any step
- "Launch Brandflow" CTA → sets `onboarding_completed = true`
- Redirects to `/dashboard`

### UX Details
- Progress bar at top (Step 1 of 4)
- Each step auto-saves on "Next" (persist `onboarding_step`)
- User can close and resume from where they left off
- Skip buttons on optional fields (website, style refs)
- Apple-level clean design: generous whitespace, Inter font, cream/dark palette

---

## Step 3: Protected Route Logic Update

- After login, check `profiles.onboarding_completed`
- If `false` → redirect to `/onboarding`
- If `true` → proceed to `/dashboard`
- `/onboarding` accessible anytime from settings for editing

---

## Step 4: Future-Proofing (Not built now, architecture-ready)

- `website_url` field is stored for future Firecrawl integration (zero-input onboarding)
- `brand_voice_tone` + `brand_voice_keywords` map directly to Brand Voice DNA Engine input
- `brand_assets` table supports the Core Elements Board (F6) composite generation
- `brand_colors` feeds into template customization and image generation prompts

---

## Build Order

1. **Migration** — Extend profiles + create brand_assets table with RLS
2. **OnboardingWizard component** — 4-step form with progress bar
3. **Individual step components** — BusinessBasics, BrandIdentity, BrandVoice, ReviewLaunch
4. **Route protection update** — Gate dashboard behind onboarding completion
5. **Polish** — Animations, auto-save, resume logic

---

## Success Criteria

- New user signs up → lands on onboarding wizard (not empty dashboard)
- Completes all 4 steps in under 3 minutes
- Can close browser and resume from last step
- After completion, never sees onboarding again (unless from settings)
- All brand data persisted and queryable for future generation prompts
