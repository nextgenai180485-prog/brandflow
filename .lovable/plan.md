
## Make Showcase Templates Actionable (Preview + Quick-Use)

### What Changes

**1. Connect showcase to database** — Replace static imported images with a live query to `ad_reference_library` (entries with `thumbnail_url`). This means the showcase automatically updates when admin adds/removes templates.

**2. Create `ShowcaseDetailModal` component** — When a user clicks any template card:
- Full-size image with SEALCaM analysis breakdown (composition, lighting, mood, focal point)
- Industry/mood/platform tags displayed as badges
- Performance notes
- **"Create Campaign from This"** CTA button

**3. Quick-Use flow** — The CTA navigates to `/dashboard/campaigns/new` and passes the template reference (ID, industry, mood, platform tags) as route state. The campaign wizard auto-fills:
- Title pre-populated (e.g., "Fashion Editorial Campaign")
- Platform tags → pre-select matching platforms
- The reference gets auto-attached via the Library Browser in the Creative Direction step

### Files

| File | Action |
|---|---|
| `src/components/EmptyCampaigns.tsx` | Replace static imports with DB query, add click handler |
| `src/components/ShowcaseDetailModal.tsx` | **New** — Detail modal with image, tags, SEALCaM, CTA |
| `src/pages/NewCampaign.tsx` | Accept route state to pre-fill from template reference |

### Technical Notes
- Query uses existing `supabase` client with the authenticated RLS policy
- No new tables or migrations needed — reads from `ad_reference_library`
- Static showcase images (`src/assets/showcase/*`) become fallback-only (no breakage if DB is empty)
- Modal uses existing `Dialog` from shadcn
