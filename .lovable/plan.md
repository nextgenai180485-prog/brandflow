
## Replace Slide-In Sheet → Full-Page Campaign Review

The current slide-in sheet is a constrained overlay that fights with the dashboard. Enterprise tools use a **dedicated review page** — you click a campaign card and navigate into a full workspace.

### Architecture

**`/dashboard/campaign/:id`** — Full-page Campaign Review

**Layout**: Same enterprise workspace pattern as the campaign creator:
- **Left panel (50%)**: Asset grid with thumbnails, approval/reject buttons, batch actions, caption editor
- **Right panel (50%)**: iPhone 16 Pro Simulator showing the active asset at full fidelity

**Top bar**: Campaign title, status badge, back-to-dashboard button, bulk actions (Approve All, Download All)

**Asset grid behavior**:
- Cards show thumbnail + platform badge + status indicator
- Click a card → it loads in the simulator on the right
- Keyboard nav (arrows, A/R/D) still works
- Multi-select for batch approve/reject/download

### Changes

1. **`src/pages/CampaignReview.tsx`** — Rewrite as full-page workspace (not the existing unused file)
2. **`src/App.tsx`** — Add route `/dashboard/campaign/:id`
3. **`src/pages/Dashboard.tsx`** — Change card click from `setSheetCampaignId` to `navigate(/dashboard/campaign/${id})`
4. **Remove**: `AssetInspectorSheet` import and usage from Dashboard

### Result
- Campaign card click → navigates to `/dashboard/campaign/:id`
- Full viewport workspace with asset grid + simulator
- No overlay, no slide-in, no fighting for space
