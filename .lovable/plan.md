# F1-F9 Family Intelligence + Auto-Routing

## Phase 1: CSO Agent — Full Family Knowledge Injection

Update the CSO system prompt (`cmo-chat/index.ts`) with complete F1-F9 family taxonomy:

| Family | Name | Best For | Platforms |
|--------|------|----------|-----------|
| F1 | UGC Video Ads | Authentic testimonials, before/after, unboxing | TikTok, IG Reels, YT Shorts |
| F2 | AI Spokesperson | Talking-head authority, explainers, product demos | LinkedIn, YouTube, Facebook |
| F3 | Product Videography | Hero shots, product-in-motion, lifestyle B-roll | Instagram, Pinterest, eCommerce |
| F4 | Social Content Batch | Carousel posts, text posts, quote cards | All social platforms |
| F5 | Cinematic Ad | Premium brand films, aspirational lifestyle ads | YouTube, TV/OTT, LinkedIn |
| F6 | Core Elements Board | Brand asset prep (logos, color systems, typography) | Internal use / design handoff |
| F7 | Ad Creator | Static/animated ad creatives with approval gates | Meta Ads, Google Display, LinkedIn |
| F8 | Creative Cloner | Template-driven recreation from reference ads | Any (mirrors source) |
| F9 | Image Template | Text overlay compositions, promotional graphics | Instagram, Stories, Email |

The CSO will use this to:
- Recommend families based on brand archetype + funnel stage
- Explain WHY a family fits ("Your luxury positioning demands F5 Cinematic, not F1 UGC")
- Map platform selections to optimal families

## Phase 2: Campaign Wizard Auto-Routing

Update the Campaign Wizard's content type selection to auto-map user choices to the correct family:

```
User picks "UGC Video" + "TikTok" → F1
User picks "Pro Video" + "LinkedIn" → F2 or F5 (based on brand tier)
User picks "Image" + "Instagram" → F9 or F7 (based on intent)
User picks "Social Content" + multi-platform → F4
```

The routing logic lives in the campaign creation flow and sets `family` on the campaign/generation request automatically — users never see "F1" or "F9", they see goal-oriented labels.

## Phase 3: CMO Reactive Panel (Tactical)

Add lightweight family awareness to the CMO reactive prompt (`cmo-agent/index.ts`) so it can validate the auto-selected family during campaign setup and suggest alternatives if the strategy doesn't match.

## Files Changed
- `supabase/functions/cmo-chat/index.ts` — Full family taxonomy in system prompt
- `supabase/functions/cmo-agent/index.ts` — Family validation awareness
- `src/pages/NewCampaign.tsx` — Auto-routing logic from content type + platform → family
- Deploy both edge functions
