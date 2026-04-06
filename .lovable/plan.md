## Phase 1: Inline Campaign Creator Page

**Goal:** Replace the modal dialog with a dedicated `/dashboard/campaigns/new` page.

- New route `/dashboard/campaigns/new` with full-page inline form
- Campaign name + instructions fields inline (no modal)
- Back arrow to `/dashboard`
- "New Campaign" button on Dashboard navigates here instead of opening dialog

## Phase 2: Multi-Asset Dropzone & Filmstrip

**Goal:** Replace single file upload with bulk drag-and-drop + filmstrip thumbnail manager.

- Full-width hero dropzone with dashed border (supports multiple files)
- On upload: dropzone shrinks into horizontal filmstrip (scrollable thumbnails)
- Each thumbnail shows: preview, remove (X) button, file name
- "Add More" square at the end of the filmstrip
- Mobile: 3-column compact grid instead of horizontal scroll
- All files upload to `campaign_assets/{user_id}/` in Supabase Storage
- Track multiple files in local state before campaign creation

## Phase 3: Batch Asset Records

**Goal:** Create `generated_assets` records for every uploaded file on campaign submit.

- On "Create Campaign": insert campaign row, then batch-insert one `generated_assets` record per uploaded file
- Each record gets `asset_type` (image/video) auto-detected from MIME type
- Status defaults to `pending_review`
- Navigate to `/dashboard/campaigns/:id` on success

## Phase 4: Campaign Details — Multi-Asset Feed

**Goal:** The feed view already exists (AssetFeedCard). Ensure it renders all uploaded assets as individual feed cards.

- Each uploaded asset appears as its own social-style card with caption
- Add "Accept All" / "Reject All" bulk action buttons at top of feed
- GenerateButton creates variants for ALL uploaded assets (not just one)

## Phase 5: Mobile Polish

**Goal:** Ensure the inline canvas is thumb-friendly on mobile.

- Dropzone full-width with large tap target
- Filmstrip becomes 3-col grid on mobile
- Create button sticky at bottom on mobile
- Test at 375px, 390px viewports
