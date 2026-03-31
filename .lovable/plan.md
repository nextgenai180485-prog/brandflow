

# Update Add-On / Overage Pricing

## What Changes

Replace the generic add-on packs in `docs/BRANDFLOW_PRICING_STRATEGY.md` Section 5 (Overage Pricing) with per-video-type individual add-ons.

## New Add-On Pricing

| Add-On | Price | Margin Notes |
|--------|-------|-------------|
| Content Pack (20 text batches) | $9 | ~$0.20 COGS → 98% margin |
| Image Pack (20 SeedEdit images) | $9 | ~$1.40 COGS → 84% margin |
| UGC Video (F1, single) | $4.99 | $0.50–$0.80 COGS → 84–90% margin |
| Spokesperson Video (F2, 30s) | $7.99 | $0.80–$1.20 COGS → 85–90% margin |
| Product Videography (F3, single) | $4.99 | $0.50–$0.80 COGS → 84–90% margin |
| Cinematic Ad (F5, single) | $9.99 | $1.00–$1.50 COGS → 85–90% margin |

Pricing rationale: priced per individual unit (not packs) for videos, reflecting provider cost and production complexity. Spokesperson and Cinematic are premium due to higher compute and multi-scene pipelines.

## Auto-Upgrade Nudge

Add note: if a user consistently purchases 5+ add-ons/month, surface an upgrade prompt showing them the savings of the next tier.

## File Changed

| File | Action |
|------|--------|
| `docs/BRANDFLOW_PRICING_STRATEGY.md` | Replace Section 5 (Overage Pricing) with per-video-type individual add-ons and updated margin analysis |

