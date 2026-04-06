
# Master-Detail Review Canvas — Phased Plan

## Phase 1: Grid Workspace Refinement
- Fix precision spacing: 64px header, 24px gap to title, 16px to filters, 8px grid alignment
- Tighten the generation grid to true 4-6 column density with `aspect-ratio` CSS for mixed formats (9:16, 4:5, 1:1, 16:9) in the same row
- Carousel cards show a "stack" visual (layered shadow effect) with slide count badge

## Phase 2: Inspector Side Panel (The Detail View)
- Click any asset card → Shadcn `Sheet` slides in from the right (400px wide)
- Shows: full-size preview at native aspect ratio, caption text, platform badge, format dimensions
- Action buttons: **Accept**, **Reject**, **Regenerate** — all inline in the panel
- Carousel assets get a slide navigator (prev/next) inside the panel
- Selected card gets a 2px brand-color border highlight in the grid

## Phase 3: Inline Quick-Schedule
- Add a "Schedule" button inside the Inspector panel
- Clicking it reveals an inline mini-calendar + time picker + platform selector (no separate modal)
- On confirm → asset/campaign gets a "Scheduled" badge with date overlay on the card
- Removes the need for the separate ScheduleModal popup

## Phase 4: Carousel Auto-Preview
- Carousel cards auto-cycle slides on hover (1.5s per slide)
- Caption truncated to 2 lines on the card, full caption in the Inspector
- Slide indicator dots on the card thumbnail

## Phase 5: Polish & Mobile Adaptation
- On mobile (<768px): Inspector becomes a bottom sheet (full-width drawer)
- Grid collapses to 2 columns with touch-friendly tap targets
- Swipe gestures on carousel previews
- Keyboard shortcuts: Arrow keys to navigate grid, Enter to accept, Backspace to reject
