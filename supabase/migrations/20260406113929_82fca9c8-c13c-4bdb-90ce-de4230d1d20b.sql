
-- Create campaign_research table for storing Exa research results
CREATE TABLE public.campaign_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL,
  research_type TEXT NOT NULL DEFAULT 'market_trends',
  query TEXT NOT NULL,
  results JSONB DEFAULT '{}',
  intelligence_brief JSONB DEFAULT '{}',
  provider TEXT NOT NULL DEFAULT 'exa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_research ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own research"
  ON public.campaign_research FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can create their own research"
  ON public.campaign_research FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own research"
  ON public.campaign_research FOR DELETE
  USING (auth.uid() = profile_id);

-- Add cost/provider tracking to generated_assets
ALTER TABLE public.generated_assets
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS generation_cost NUMERIC(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS research_id UUID REFERENCES public.campaign_research(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rationale TEXT;

-- Index for fast lookups
CREATE INDEX idx_campaign_research_campaign ON public.campaign_research(campaign_id);
CREATE INDEX idx_generated_assets_provider ON public.generated_assets(provider);
