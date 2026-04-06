
-- Decision Traces table for Trust & Explainability Engine
CREATE TABLE public.decision_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  asset_id UUID,
  research_id UUID,
  decision_summary TEXT NOT NULL,
  creative_directions JSONB NOT NULL DEFAULT '[]',
  scoring_criteria JSONB NOT NULL DEFAULT '{}',
  winner JSONB NOT NULL DEFAULT '{}',
  rejected_alternatives JSONB NOT NULL DEFAULT '[]',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  brand_memory_influences JSONB NOT NULL DEFAULT '[]',
  research_sources JSONB NOT NULL DEFAULT '[]',
  assumptions JSONB NOT NULL DEFAULT '[]',
  next_test_recommendation JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_traces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own traces" ON public.decision_traces FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can create their own traces" ON public.decision_traces FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own traces" ON public.decision_traces FOR DELETE USING (auth.uid() = profile_id);

CREATE INDEX idx_decision_traces_campaign ON public.decision_traces(campaign_id);
CREATE INDEX idx_decision_traces_asset ON public.decision_traces(asset_id);

-- Brand Memory table for learning from every interaction
CREATE TABLE public.brand_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'approval',
  pattern_category TEXT NOT NULL,
  pattern_value TEXT NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memory" ON public.brand_memory FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can create their own memory" ON public.brand_memory FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own memory" ON public.brand_memory FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own memory" ON public.brand_memory FOR DELETE USING (auth.uid() = profile_id);

CREATE INDEX idx_brand_memory_profile ON public.brand_memory(profile_id);
CREATE INDEX idx_brand_memory_type ON public.brand_memory(profile_id, memory_type);
CREATE INDEX idx_brand_memory_pattern ON public.brand_memory(profile_id, pattern_category);

-- Trigger for updated_at on brand_memory
CREATE TRIGGER update_brand_memory_updated_at
  BEFORE UPDATE ON public.brand_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
