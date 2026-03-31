

## Save Feature Gaps + Pricing Strategy

Two documents to create capturing the strategic analysis from our conversation that isn't yet saved anywhere.

### File 1: `docs/BRANDFLOW_FEATURE_GAPS.md`

Feature expansion gaps identified beyond the 10 engine modules (those are already in `CROSS_FAMILY_ENGINE_AUDIT.md`):

- **Brand Voice DNA Engine** -- Extract tone, vocabulary, sentence patterns from existing user content via Firecrawl. Store as `brand_voice_profile` (JSONB). Inject into every generation prompt so output sounds like the brand, not generic AI.
- **Competitor Intelligence Module** -- Monitor competitor social handles, scrape their top-performing content, feed insights into the Hook Library and surface weekly reports to users.
- **A/B Variant Generation** -- Auto-generate 2-3 variants per content piece using different hook types (question vs social_proof vs urgency). Let users pick or A/B test.
- **Content Repurposing Engine** -- One asset in, many formats out. Blog post becomes social batch becomes video ad becomes email header. Cross-family orchestration.
- **Zero-Input Brand Onboarding** -- User provides website URL only. Firecrawl scrapes logo, colors, fonts, product images, brand voice, and populates the entire brand profile automatically.
- **Smart Scheduling + Auto-Posting** -- Connect social accounts, AI picks optimal posting times per platform based on Hook Library engagement data, auto-publishes approved content.
- **Performance Feedback Loop** -- After posting, pull engagement metrics back into `brand_content_history`. System learns which hook types, tones, and formats perform best for each brand over time.

### File 2: `docs/BRANDFLOW_PRICING_STRATEGY.md`

Pricing model and cost analysis:

**Unit Cost Breakdown:**
- Social content batch (7 platforms, text only): ~$0.01 (Gemini)
- Image generation (Seedream 5.0 Lite): ~$0.035/image
- Image template recreation: ~$0.07 (2-pass)
- UGC video (single scene): ~$0.50-0.80
- Full video ad (multi-scene + music): ~$1.00-1.50
- Creative Cloner (analysis + 3 scenes + music): ~$2.00-2.50

**Proposed Tier Structure:**
| Plan | Price | Included | Key Features |
|------|-------|----------|--------------|
| Starter | $29/mo | 30 content batches, 10 images | Social content, image templates, 1 brand |
| Growth | $79/mo | 100 batches, 50 images, 5 videos | + Video ads, Hook Library, competitor monitoring, 3 brands |
| Pro | $199/mo | 300 batches, 150 images, 20 videos | + Creative Cloner, A/B variants, auto-posting, 10 brands |
| Agency | $499/mo | Unlimited batches, 500 images, 50 videos | + White-label, team seats, API access, unlimited brands |

**Pricing Philosophy:**
- Value-based (content pieces), not usage-based (API calls)
- Video gated to higher tiers (expensive compute)
- Every tier profitable at 3x margin minimum
- Free trial: 3 social batches + 3 images to demonstrate value

### Steps

1. Create `docs/BRANDFLOW_FEATURE_GAPS.md` with all 7 feature gaps
2. Create `docs/BRANDFLOW_PRICING_STRATEGY.md` with cost analysis and tier structure

