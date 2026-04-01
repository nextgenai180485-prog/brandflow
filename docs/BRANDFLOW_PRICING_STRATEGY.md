# Brandflow Pricing Strategy

> **Status**: Design reference — not yet implemented  
> **Purpose**: Define value-based pricing tiers grounded in actual generation costs  
> **Philosophy**: Price on content output (what users care about), not API calls (what we care about)

---

## 1. Unit Cost Breakdown

Estimated per-unit generation costs based on current provider pricing:

| Generation Type | Provider | Model | Est. Cost |
|----------------|----------|-------|-----------|
| Social content batch (7 platforms, text only) | Lovable AI Gateway | Gemini 3 Flash | ~$0.01 |
| Image template recreation (SeedEdit, 2-pass) | BytePlus ModelArk | SeedEdit | ~$0.07 |
| Vision analysis (per image) | Google AI SDK | Gemini 2.0 Flash | ~$0.005 |
| UGC video (F1, ~5–15s) | Kie AI | Kling 2.6 | ~$0.50–$0.80 |
| Spokesperson video (F2, 30s) | Kie AI | Kling 2.6 | ~$0.80–$1.20 |
| Product Videography (F3, ~15s) | Kie AI | Kling 2.6 | ~$0.50–$0.80 |
| Cinematic Ad (F5, ~15–30s, 3 scenes + music) | Kie AI + Suno | Kling 2.6 + Suno V4 | ~$1.00–$1.50 |
| Creative Cloner (analysis + 3 scenes + music + assembly) | Multiple | Full pipeline | ~$2.00–$2.50 |
| Hook Library query | Supabase | PostgreSQL | ~$0.00 (negligible) |
| Brand Voice analysis (one-time) | Firecrawl + Gemini | Scrape + classify | ~$0.10 |

---

## 2. Pricing Tiers

### Starter — $39/mo (1 brand)

**Target**: Solopreneurs, small business owners, side hustlers

| Resource | Qty | Unit Cost | Total COGS |
|----------|-----|-----------|------------|
| Text batches | 30 | $0.01 | $0.30 |
| Images (SeedEdit) | 30 | $0.07 | $2.10 |
| UGC Videos (F1) | 5 | $0.50–$0.80 | $2.50–$4.00 |
| Spokesperson Videos (F2, 30s) | 1 (teaser) | $0.80–$1.20 | $0.80–$1.20 |
| Product Videography (F3) | 2 | $0.50–$0.80 | $1.00–$1.60 |
| Brand Voice analysis | 1 | $0.10 | $0.10 |
| **Total COGS** | | | **$6.80–$9.30** |
| **Margin** | | | **76–83%** |

**Features**:
- Social Content Engine (F4) — 7-platform text generation
- Image Template Engine — select from template gallery, swap assets/text/colors
- Hook Library — AI-powered captions grounded in proven hooks
- Basic brand profile (manual setup)
- UGC Video generation (F1) — 5 videos/month
- Spokesperson Video (F2) — 1 teaser/month (upgrade nudge)
- Product Videography (F3) — 2 videos/month

---

### Growth — $99/mo (3 brands)

**Target**: Growing brands, content creators, small marketing teams

| Resource | Qty | Unit Cost | Total COGS |
|----------|-----|-----------|------------|
| Text batches | 90 | $0.01 | $0.90 |
| Images (SeedEdit) | 90 | $0.07 | $6.30 |
| UGC Videos (F1) | 12 | $0.50–$0.80 | $6.00–$9.60 |
| Spokesperson Videos (F2, 30s) | 6 | $0.80–$1.20 | $4.80–$7.20 |
| Product Videography (F3) | 6 | $0.50–$0.80 | $3.00–$4.80 |
| Brand Voice analysis | 3 | $0.10 | $0.30 |
| **Total COGS** | | | **$21.30–$29.10** |
| **Margin** | | | **71–78%** |

**Features**:
- Everything in Starter
- 3 images/day workflow cadence (90/month)
- Hook Library with industry filtering
- Competitor monitoring (3 competitors)
- Zero-input brand onboarding (Firecrawl)
- Brand Voice DNA extraction
- Full Spokesperson Video access (F2, 30s) — 6/month
- Product Videography (F3) — 6/month

---

### Pro — $299/mo (10 brands)

**Target**: Professional marketers, small agencies, e-commerce brands

| Resource | Qty | Unit Cost | Total COGS |
|----------|-----|-----------|------------|
| Text batches | 300 | $0.01 | $3.00 |
| Images (SeedEdit) | 300 | $0.07 | $21.00 |
| UGC Videos (F1) | 30 | $0.50–$0.80 | $15.00–$24.00 |
| Spokesperson Videos (F2, 30s) | 20 | $0.80–$1.20 | $16.00–$24.00 |
| Product Videography (F3) | 20 | $0.50–$0.80 | $10.00–$16.00 |
| Cinematic Ads (F5) | 10 | $1.00–$1.50 | $10.00–$15.00 |
| Brand Voice analysis | 10 | $0.10 | $1.00 |
| **Total COGS** | | | **$76.00–$104.00** |
| **Margin** | | | **65–75%** |

**Features**:
- Everything in Growth
- **Team Access** — 3–5 sub-user seats (Editor / Viewer / Approver roles)
- Cinematic Ad generation (F5) — 10/month
- Creative Cloner Engine (F8)
- A/B variant generation (2–3 variants per piece)
- Smart scheduling + auto-posting
- Content repurposing chains
- Performance feedback loop
- Priority generation queue
- Multi-step approval chains
- Budget spend caps

---

### Agency — $999+/mo · Contact Sales (Unlimited brands)

**Target**: Marketing agencies, enterprise teams, white-label resellers

| Resource | Internal Reference Qty | Unit Cost | Total COGS |
|----------|----------------------|-----------|------------|
| Text batches | ~500 (unlimited) | $0.01 | ~$5.00 |
| Images (SeedEdit) | 500 | $0.07 | $35.00 |
| UGC Videos (F1) | 40 | $0.50–$0.80 | $20.00–$32.00 |
| Spokesperson Videos (F2, 30s) | 25 | $0.80–$1.20 | $20.00–$30.00 |
| Product Videography (F3) | 20 | $0.50–$0.80 | $10.00–$16.00 |
| Cinematic Ads (F5) | 15 | $1.00–$1.50 | $15.00–$22.50 |
| Brand Voice analysis | ~20 (unlimited) | $0.10 | ~$2.00 |
| **Total COGS** | | | **~$107.00–$142.50** |
| **Margin at $999** | | | **86%+** |

**Pricing model**: $999/mo minimum floor. Final pricing negotiated per deal based on volume, SLA requirements, and custom integrations.

**Features**:
- Everything in Pro
- White-label output (no Brandflow branding)
- 10+ team seats
- API access for custom integrations
- Dedicated support + SLA
- Custom template uploads
- Bulk generation workflows
- Advanced analytics dashboard
- Competitor intelligence (unlimited competitors)

---

## 3. Margin Analysis

| Tier | Price | Max COGS | Min Margin | Realistic Margin (40% usage) |
|------|-------|----------|------------|------------------------------|
| Starter | $39 | $6.80–$9.30 | 76–83% | 90%+ |
| Growth | $99 | $21.30–$29.10 | 71–78% | 86%+ |
| Pro | $299 | $76.00–$104.00 | 65–75% | 83%+ |
| Agency | $999+ | $107.00–$142.50 | 86%+ | 94%+ |

**Note**: "Max COGS" assumes users consume 100% of their allocation. Typical SaaS usage is 30–60% of allocation, so real margins will be significantly higher.

---

## 4. Free Trial

**Included**:
- 3 social content batches (see the AI write for 7 platforms)
- 3 image generations (see SeedEdit template recreation quality)
- 1 brand profile (zero-input onboarding if they provide a URL)

**Purpose**: Let users experience the magic before paying. The zero-input onboarding is the hook — they enter a URL and see their brand assets auto-populated in seconds.

**No credit card required** for trial. Convert on value demonstration, not payment friction.

---

## 5. Overage & Add-On Pricing

When users exceed their tier limits, they can purchase additional units individually:

### Asset Packs

| Add-On | Price | COGS | Margin |
|--------|-------|------|--------|
| Content Pack (20 text batches) | $9 | ~$0.20 | ~98% |
| Image Pack (20 SeedEdit images) | $9 | ~$1.40 | ~84% |

### Individual Video Add-Ons

| Add-On | Price | COGS | Margin |
|--------|-------|------|--------|
| UGC Video (F1, single) | $4.99 | $0.50–$0.80 | 84–90% |
| Spokesperson Video (F2, 30s, single) | $7.99 | $0.80–$1.20 | 85–90% |
| Product Videography (F3, single) | $4.99 | $0.50–$0.80 | 84–90% |
| Cinematic Ad (F5, single) | $9.99 | $1.00–$1.50 | 85–90% |

**Pricing rationale**: Videos are priced per individual unit (not packs), reflecting provider cost and production complexity. Spokesperson and Cinematic command premium pricing due to higher compute requirements and multi-scene rendering pipelines.

### Auto-Upgrade Nudge

If a user purchases **5+ individual add-ons in a single billing cycle**, surface an upgrade prompt showing them the cost savings of the next tier. Example: "You spent $34.95 on add-ons this month — upgrading to Growth would save you $X and include Y more videos."

---

## 6. Pricing Philosophy

### Why Value-Based, Not Usage-Based

- Users think in "posts per month," not "API calls per month"
- Predictable billing builds trust — no surprise charges
- Simplifies the buying decision — "Can I afford 100 posts/month?"
- Aligns with competitors (Buffer, Hootsuite, Later all price on posts/channels)

### Why Video Is Gated by Type

- Video generation costs 10–50x more than text/image
- Cinematic Ads (F5) and Creative Cloner (F8) are gated to Pro+ as premium differentiators
- Starter gets a Spokesperson teaser (1/month) to demonstrate value and drive upgrades
- Product Videography on Starter (2/month) lets e-commerce users see immediate ROI

### Why Unlimited Text on Agency

- Text generation is nearly free (~$0.01/batch)
- Agencies need volume — limiting text creates friction
- The real cost driver is video — that's still negotiated
- "Unlimited" is a powerful sales word for the agency segment

### Why Agency Is Contact Sales

- Enterprise deals vary wildly in scope (5 brands vs 50 brands)
- Custom SLAs, white-labeling, and API access need scoping
- $999 floor ensures we don't undervalue the offering
- High-touch onboarding justifies premium pricing

---

## 7. Revenue Projections (Conservative)

Assuming 1,000 paying users after 12 months:

| Tier | % of Users | Users | MRR |
|------|-----------|-------|-----|
| Starter | 40% | 400 | $15,600 |
| Growth | 35% | 350 | $34,650 |
| Pro | 18% | 180 | $53,820 |
| Agency | 7% | 70 | $69,930 |
| **Total** | | **1,000** | **$174,000** |

**Annual run rate**: ~$2.09M  
**Estimated COGS** (at 40% usage): ~$22,000/month  
**Gross margin**: ~87%

---

## Cross-References

- **Feature Gaps**: `docs/BRANDFLOW_FEATURE_GAPS.md`
- **Engine Modules**: `docs/pipelines/CROSS_FAMILY_ENGINE_AUDIT.md`
- **Hook Library**: `docs/pipelines/HOOK_LIBRARY_ENGINE_DESIGN.md`
- **Creative Cloner**: `docs/pipelines/CREATIVE_CLONER_ENGINE_DESIGN.md`
- **Image Template**: `docs/pipelines/IMAGE_TEMPLATE_ENGINE_DESIGN.md`
- **Image Template UX Flow**: `docs/ux/IMAGE_TEMPLATE_UX_FLOW.md`
