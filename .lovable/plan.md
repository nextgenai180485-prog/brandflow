
## Phase 1: Campaign Feed Card Component

**Goal:** Build the atomic `AssetFeedCard` component that replaces the current `AssetCard`.

- **Header:** Campaign icon/thumbnail, campaign title, truncated ID, status badge, kebab menu
- **Body:** Full-width generated image/video preview (like an Instagram post)
- **Caption Block:** AI-generated caption below the image with `✨ AI Caption` tag, italic text, accept/reject/re-roll buttons
- **Footer:** Metric row (asset type icon, creation date, status)
- **Responsive:** Full-bleed on mobile, rounded cards on desktop

## Phase 2: Adaptive Feed Grid Layout

**Goal:** Replace the current two-column CampaignDetails layout with a responsive feed.

- **Desktop (lg+):** 2-column grid of cards
- **Tablet (md):** 2-column grid
- **Mobile (<md):** Single-column full-width feed (Instagram-style)
- Campaign header stays at top: back arrow, title (text-3xl), status badge
- "Generate" button pinned in header area

## Phase 3: Caption Data Model

**Goal:** Wire captions into the existing `generated_assets` table.

- Use the existing `content_text` field on image/video assets to store the AI-generated caption
- Update `GenerateButton` to include a caption in `content_text` for every image/video asset it creates
- No migration needed — `content_text` column already exists

## Phase 4: Accept/Reject Per-Asset (Caption + Visual)

**Goal:** Approval actions directly on each feed card.

- Accept → marks asset `approved` (emerald badge, caption confirmed)
- Reject → marks asset `rejected` (red badge, shows regenerate)
- Re-roll caption → triggers caption-only regeneration (updates `content_text`)
- Edit caption → inline editable textarea on click
- Campaign auto-transitions when all assets approved

## Phase 5: Mobile Polish

**Goal:** Thumb-friendly, production-ready mobile experience.

- Full-width cards with no horizontal margins on mobile
- Accept/Reject buttons become large tappable targets (min h-12)
- Caption text scrollable if >3 lines on mobile
- Sticky "Generate" button at bottom on mobile
- Test at 375px, 390px, 414px viewports
