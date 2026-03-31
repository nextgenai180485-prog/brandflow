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
| Single image generation | BytePlus ModelArk | Seedream 5.0 Lite | ~$0.035 |
| Image template recreation (2-pass) | BytePlus ModelArk | Seedream + SeedEdit | ~$0.07 |
| Vision analysis (per image) | Google AI SDK | Gemini 2.0 Flash | ~$0.005 |
| UGC video (single scene, 5s) | Kie AI | Kling 2.6 | ~$0.50–0.80 |
| Full video ad (3 scenes + music) | Kie AI | Kling 2.6 + Suno V4 | ~$1.00–1.50 |
| Creative Cloner (analysis + 3 scenes + music + assembly) | Multiple | Full pipeline | ~$2.00–2.50 |
| Hook Library query | Supabase | PostgreSQL | ~$0.00 (negligible) |
| Brand Voice analysis (one-time) | Firecrawl + Gemini | Scrape + classify | ~$0.10 |

---

## 2. Pricing Tiers

### Starter — $29/month

**Target**: Solopreneurs, small business owners, side hustlers

| Resource | Included |
|----------|----------|
| Content batches | 30/month |
| Image generations | 10/month |
| Video generations | 0 |
| Brands | 1 |

**Features**:
- Social Content Engine (F4) — 7-platform text generation
- Image Template Engine — select from template gallery
- Hook Library — AI-powered captions grounded in proven hooks
- Basic brand profile (manual setup)

**Our cost at full usage**: ~$0.30 (text) + ~$0.35 (images) = **~$0.65/month**  
**Margin**: ~97%

---

### Growth — $79/month

**Target**: Growing brands, content creators, small marketing teams

| Resource | Included |
|----------|----------|
| Content batches | 100/month |
| Image generations | 50/month |
| Video generations | 5/month |
| Brands | 3 |

**Features**:
- Everything in Starter
- Video Ad generation (F7 Ad Creator)
- UGC Video generation (F1)
- Hook Library with industry filtering
- Competitor monitoring (3 competitors)
- Zero-input brand onboarding (Firecrawl)
- Brand Voice DNA extraction

**Our cost at full usage**: ~$1.00 (text) + ~$1.75 (images) + ~$5.00 (videos) = **~$7.75/month**  
**Margin**: ~90%

---

### Pro — $199/month

**Target**: Professional marketers, agencies (small), e-commerce brands

| Resource | Included |
|----------|----------|
| Content batches | 300/month |
| Image generations | 150/month |
| Video generations | 20/month |
| Brands | 10 |

**Features**:
- Everything in Growth
- Creative Cloner Engine (F8)
- Cinematic Ad generation (F5)
- Product Videography (F3)
- A/B variant generation (2-3 variants per piece)
- Smart scheduling + auto-posting
- Content repurposing chains
- Performance feedback loop
- Priority generation queue

**Our cost at full usage**: ~$3.00 (text) + ~$5.25 (images) + ~$30.00 (videos) = **~$38.25/month**  
**Margin**: ~80%

---

### Agency — $499/month

**Target**: Marketing agencies, enterprise teams, white-label resellers

| Resource | Included |
|----------|----------|
| Content batches | Unlimited |
| Image generations | 500/month |
| Video generations | 50/month |
| Brands | Unlimited |

**Features**:
- Everything in Pro
- White-label output (no Brandflow branding)
- Team seats (up to 10)
- API access for custom integrations
- Dedicated support
- Custom template uploads
- Bulk generation workflows
- Advanced analytics dashboard
- Competitor intelligence (unlimited competitors)

**Our cost at full usage**: ~$10.00 (text) + ~$17.50 (images) + ~$75.00 (videos) = **~$102.50/month**  
**Margin**: ~79%

---

## 3. Margin Analysis

| Tier | Price | Max Cost | Min Margin | Target Margin |
|------|-------|----------|------------|---------------|
| Starter | $29 | $0.65 | 97% | 95%+ |
| Growth | $79 | $7.75 | 90% | 85%+ |
| Pro | $199 | $38.25 | 80% | 75%+ |
| Agency | $499 | $102.50 | 79% | 75%+ |

**Note**: "Max cost" assumes users consume 100% of their allocation. Typical SaaS usage is 30-60% of allocation, so real margins will be higher.

---

## 4. Free Trial

**Included**:
- 3 social content batches (see the AI write for 7 platforms)
- 3 image generations (see template recreation quality)
- 1 brand profile (zero-input onboarding if they provide a URL)

**Purpose**: Let users experience the magic before paying. The zero-input onboarding is the hook — they enter a URL and see their brand assets auto-populated in seconds.

**No credit card required** for trial. Convert on value demonstration, not payment friction.

---

## 5. Overage Pricing

When users exceed their tier limits, they can purchase add-on packs:

| Add-On | Price | Included |
|--------|-------|----------|
| Content Pack | $9 | 20 additional content batches |
| Image Pack | $9 | 20 additional image generations |
| Video Pack | $19 | 5 additional video generations |

This keeps users on their current tier while allowing burst usage. If they consistently buy add-ons, prompt an upgrade.

---

## 6. Pricing Philosophy

### Why Value-Based, Not Usage-Based

- Users think in "posts per month," not "API calls per month"
- Predictable billing builds trust — no surprise charges
- Simplifies the buying decision — "Can I afford 100 posts/month?"
- Aligns with competitors (Buffer, Hootsuite, Later all price on posts/channels)

### Why Video Is Gated

- Video generation costs 10-50x more than text/image
- Video is the highest-perceived-value feature
- Gating video to Growth+ creates a natural upgrade path
- Users who need video are typically higher-revenue businesses who can afford $79+

### Why Unlimited Text on Agency

- Text generation is nearly free (~$0.01/batch)
- Agencies need volume — limiting text creates friction
- The real cost driver is video — that's still capped
- "Unlimited" is a powerful sales word for the agency segment

---

## 7. Revenue Projections (Conservative)

Assuming 1,000 paying users after 12 months:

| Tier | % of Users | Users | MRR |
|------|-----------|-------|-----|
| Starter | 40% | 400 | $11,600 |
| Growth | 35% | 350 | $27,650 |
| Pro | 18% | 180 | $35,820 |
| Agency | 7% | 70 | $34,930 |
| **Total** | | **1,000** | **$110,000** |

**Annual run rate**: ~$1.32M  
**Estimated COGS** (at 50% usage): ~$15,000/month  
**Gross margin**: ~86%

---

## Cross-References

- **Feature Gaps**: `docs/BRANDFLOW_FEATURE_GAPS.md`
- **Engine Modules**: `docs/pipelines/CROSS_FAMILY_ENGINE_AUDIT.md`
- **Hook Library**: `docs/pipelines/HOOK_LIBRARY_ENGINE_DESIGN.md`
- **Creative Cloner**: `docs/pipelines/CREATIVE_CLONER_ENGINE_DESIGN.md`
- **Image Template**: `docs/pipelines/IMAGE_TEMPLATE_ENGINE_DESIGN.md`
