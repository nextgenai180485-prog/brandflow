

## Make Showcase Grid Edge-to-Edge (Align with Header)

**Current state:** The masonry grid sits inside `max-w-5xl` (~64rem), while the header and dashboard content use the full fluid container (`px-4 sm:px-6`).

**Change:** Remove `max-w-5xl` from the showcase wrapper so it inherits the parent's full width, matching header alignment exactly.

### File: `src/components/EmptyCampaigns.tsx`

**Line 107** — Change:
```tsx
<div className="w-full max-w-5xl mt-16 px-4">
```
To:
```tsx
<div className="w-full mt-16">
```

The parent container in Dashboard already provides horizontal padding (`px-4 sm:px-6`), so removing both `max-w-5xl` and the redundant `px-4` lets the grid start and end exactly where the header does.

**Result:** The masonry grid, tabs, and filter chips all align flush with the header edges — consistent with Linear/Stripe full-bleed content patterns. The centered welcome text + CTA above stays centered (it has its own `max-w-xs`/`max-w-sm` constraints).

