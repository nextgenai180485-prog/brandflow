## Command Center: Enterprise-Grade Dashboard Redesign

### What We're Building
Replace the current Dashboard (campaign card grid) and Campaign Review page with a **single Command Center** — a living workspace where everything comes to the user.

### Architecture

#### Zone 1: Activity Feed Header
- **Real-time stats bar**: Total assets generating, pending review, approved today, published this week
- **Quick actions**: New Campaign button + smart suggestions from CMO
- **Strategy widget** stays (collapsible) but becomes more compact

#### Zone 2: Campaign Grid (Enhanced)
- Keep the existing card grid but enhance cards with:
  - **Live pulse indicator** on generating campaigns (animated ring)
  - **Progress bar** showing assets completed vs total
  - **Quick-action hover strip**: Star, Approve All, Open buttons appear on hover
  - **Inline asset count breakdown** by platform (IG: 3, TT: 2, LI: 1)

#### Zone 3: Asset Inspector Sheet (NEW — The Core Innovation)
- **Slide-in from right** when clicking any campaign card or asset
- Uses `Sheet` component (shadcn) with 480px width
- Contains:
  1. **Campaign header** (title, status, date)
  2. **Asset carousel** — horizontal strip of all campaign assets, scrollable
  3. **iPhone 16 Pro Simulator** showing selected asset with platform context
  4. **Actions panel**: Star, Edit (SeedEdit), Download, Save to Library, Approve, Reject
  5. **Caption editor** inline
  6. **AI Rationale** collapsible (why the AI chose this creative direction)

#### Zone 4: Keyboard Review Mode
- When Sheet is open, arrow keys (← →) cycle through assets
- `A` key = Approve, `R` = Reject, `D` = Download
- `Escape` = close sheet
- Visual indicator: "2 of 8 — Press A to approve"

#### Zone 5: Batch Operations Bar
- Appears at bottom when 2+ assets are selected (checkbox mode)
- Actions: Approve Selected, Reject Selected, Download All, Schedule Selected
- Count indicator: "4 assets selected"

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/Dashboard.tsx` | **Major rewrite** — Command Center with stats bar, enhanced grid, Sheet integration |
| `src/components/campaign/AssetInspectorSheet.tsx` | **NEW** — Slide-in sheet with simulator, carousel, actions, keyboard nav |
| `src/components/campaign/AssetCarousel.tsx` | **NEW** — Horizontal scrollable strip of asset thumbnails |
| `src/components/campaign/BatchActionBar.tsx` | **NEW** — Bottom floating bar for bulk operations |
| `src/components/campaign/CampaignCard.tsx` | **NEW** — Enhanced campaign card with live indicators |
| `src/pages/CampaignReview.tsx` | **Redirect** — Route redirects to Dashboard with sheet auto-open |
| `src/App.tsx` | Update route for `/dashboard/campaign/:id` to redirect to dashboard |

### What Gets Eliminated
- `CampaignReview.tsx` as a standalone page (becomes a redirect)
- Full-page navigation for asset review
- Context loss when reviewing assets

### Mobile Behavior
- Sheet becomes **full-screen bottom sheet** (like iOS share sheet)
- Swipe left/right on simulator to cycle assets
- Floating "Review Mode" pill for keyboard-less approval

### Technical Notes
- Reuse existing `CampaignSimulator` inside the Sheet
- All Supabase queries stay the same (campaigns + generated_assets)
- No database changes needed
- Sheet auto-opens when navigating from `/dashboard/campaign/:id` (backward compat)