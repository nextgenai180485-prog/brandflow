## Phase: Proactive Intelligence Engine

### Task 1: Silent Research on Onboarding
- Update `Onboarding.tsx` to trigger background research when website URL is entered (Step 1 → Step 2 transition)
- Create `auto-brand-research` edge function that:
  - Fetches website via direct HTTP (extract brand text, colors, imagery)
  - Runs Exa competitor search
  - Stores results in `campaign_research` or a new `brand_research` table
- Show "Brand Summary Card" on dashboard after onboarding completes

### Task 2: Selective Platform + Content Type Selection
- Redesign `NewCampaign.tsx` as multi-step:
  - **Step 1**: Select Platforms (Instagram, TikTok, LinkedIn, X, Facebook, Snapchat, YouTube)
  - **Step 2**: Select Content Types per platform (Image, UGC Video, Pro Video)
  - **Step 3**: Review Brand Insights (show pre-fetched research)
- Generate button only active when ≥1 platform AND ≥1 content type selected
- Generation payload sends ONLY selected platform+format combos (no shadow jobs)

### Task 3: Brand Insights in Campaign Builder
- Show "Brand Summary Card" at top of campaign details with AI-sourced brand identity
- "3 visual directions" preview based on research data
- "Why This" rationale integrated into direction cards

### Task 4: Website Crawling for Brand Assets
- Use direct fetch in edge function to extract brand colors, images, text from user's website
- Store extracted brand assets as reference material for generation prompts
- Pass reference images to generation provider

### Files to modify:
- `src/pages/Onboarding.tsx` — trigger auto-research
- `src/pages/NewCampaign.tsx` — multi-step platform/format selection  
- `src/pages/CampaignDetails.tsx` — brand insights card
- `supabase/functions/auto-brand-research/index.ts` — new edge function
- `supabase/functions/generate-content/index.ts` — selective payload
- `src/types/campaigns.ts` — content type definitions
