
# Enterprise Admin Buildout — 5 Phases

## Phase 1: Admin Role Gating (Security)
- Create `user_roles` table with `app_role` enum (`admin`, `moderator`, `user`)
- Create `has_role()` security definer function
- Add RLS policies on `user_roles` table
- Create `AdminRoute` wrapper component that checks role before rendering
- Gate `/dashboard/admin/libraries` behind admin role
- Add "Admin" nav item visible only to admin users

## Phase 2: File Upload in Admin Panel
- Build `FileUploadZone` component with drag-and-drop support
- Upload files to `library-assets` Supabase bucket
- Integrate into `AdminLibraryForm` — clicking the URL field opens the uploader
- Auto-populate `avatar_url`, `thumbnail_url`, `media_url` fields with the uploaded file URL
- Show inline image preview after upload

## Phase 3: Hooks Library UI
- Add "Hooks" as 5th tab in `/dashboard/admin/libraries`
- Build CRUD form for hooks: `hook_text`, `hook_type`, `family`, `platform`, `effectiveness_score`
- Update `admin-library` edge function to include `hooks` in `ALLOWED_TABLES`
- Add hooks to the user-facing `/dashboard/libraries` gallery as a browsable tab

## Phase 4: Bulk CSV/JSON Import
- Build `BulkImportModal` component with file drop zone (accepts .csv and .json)
- Parse and validate rows against the target table's schema
- Show preview table of parsed rows with error highlighting
- Submit valid rows via the `admin-library` edge function in batches
- Display import summary (success/fail counts)

## Phase 5: Admin Overview Dashboard
- Create `/dashboard/admin` landing page with stats cards
- Show per-library counts: total items, active vs inactive, total usage
- Show recent activity: last 10 items added/modified across all libraries
- Add a quick-action row: "Add Template", "Import CSV", "View Library"

## Execution Order
Start with Phase 1 immediately (security-critical), then proceed sequentially.
