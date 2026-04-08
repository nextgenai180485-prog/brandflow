

## Single Action Button — Enterprise Grade

You're right. Two buttons ("New Campaign" and "Create with N refs") is redundant. Enterprise tools use **one adaptive button** that changes its label based on context:

- **No refs selected** → `+ New Campaign` (blank workspace)
- **3 refs selected** → `+ New Campaign · 3 refs` (workspace pre-loaded)

Same button, same position, zero cognitive overhead. This is how Figma and Canva handle selection-aware actions.

### Changes

**`src/components/EmptyCampaigns.tsx`**
- Remove the conditional "Create with N refs" button from the hero section
- Pass `selectedRefs` count up to the parent so the main button can reflect it

**`src/pages/Dashboard.tsx`**
- Track selected refs from `EmptyCampaigns` via a callback or lifted state
- Update the single "New Campaign" button label:
  - `selectedIds.size === 0` → `+ New Campaign`
  - `selectedIds.size > 0` → `+ New Campaign · {n} refs`
- On click, pass refs to workspace via `location.state.bulkRefs` (existing logic)

**Result**: One button, adaptive label, zero friction.

