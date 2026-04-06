
## Content Library System — Enterprise Build Plan

### Phase 1: Database Schema (Migration)
Two new tables needed (video_templates + image_templates already exist):

**`character_library`** — AI spokesperson/actor presets for F2
- `name`, `description`, `avatar_url`, `voice_style`, `persona_traits` (jsonb)
- `gender`, `age_range`, `ethnicity_tags` (text[])
- `compatible_families` (text[]) — e.g. `{F2_spokesperson}`
- `mood_tags`, `industry_tags` (text[])
- `is_active`, `usage_count`

**`ad_reference_library`** — High-performing ad references for F8 Creative Cloner
- `title`, `description`, `media_url`, `media_type` (image/video)
- `industry_tags`, `mood_tags`, `platform_tags` (text[])
- `performance_notes` (text), `sealcam_analysis` (jsonb)
- `compatible_families` (text[])
- `is_active`, `usage_count`

RLS: Authenticated users can SELECT active records. No INSERT/UPDATE/DELETE for regular users.

### Phase 2: Admin Dashboard
- New route `/dashboard/admin/libraries`
- Tabbed UI: Video Templates | Characters | Ad References | Image Templates
- Each tab: data table with upload, edit, delete, activate/deactivate
- Upload to Supabase Storage bucket `library-assets`
- Admin-only access (check profile role or hardcoded admin check)

### Phase 3: User-Facing Library Browser
- Reusable `LibraryBrowser` component with gallery grid
- Filter by category, mood, industry, platform
- Preview cards with thumbnails
- "Use as reference" action that feeds selection into campaign wizard

### Phase 4: Campaign Wizard Integration
- Auto-match: Engine queries libraries based on brand profile + campaign settings
- Manual override: "Browse Library" button opens the browser modal
- Selected references passed to generation pipeline as context
