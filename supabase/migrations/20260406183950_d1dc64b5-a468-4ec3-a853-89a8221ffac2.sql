
-- Create brand_strategy table for the Zero-to-One Founder Protocol
CREATE TABLE public.brand_strategy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  mode TEXT NOT NULL DEFAULT 'genesis', -- 'genesis' or 'optimization'
  
  -- Founder Interview Answers
  core_value TEXT, -- "In one sentence, what problem do you solve?"
  enemy TEXT, -- "What status quo do your customers hate?"
  secret_weapon TEXT, -- "What is your unfair advantage?"
  
  -- CMO-Generated Strategy
  core_identity JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { archetype, enemy, hero_journey, brand_voice, visual_direction }
  
  persona_card JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { name, age_range, pain_points, desires, psychographic, buying_triggers }
  
  funnel_stages JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { tof: { goal, strategy, best_format, channel }, mof: {...}, bof: {...} }
  
  launch_roadmap JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ phase, action, status, priority }]
  
  current_focus TEXT NOT NULL DEFAULT 'tof', -- tof, mof, bof
  launch_readiness INTEGER NOT NULL DEFAULT 0, -- 0-100 progress
  
  interview_completed BOOLEAN NOT NULL DEFAULT false,
  strategy_generated BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_strategy ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own strategy"
ON public.brand_strategy FOR SELECT
USING (auth.uid() = profile_id);

CREATE POLICY "Users can create their own strategy"
ON public.brand_strategy FOR INSERT
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own strategy"
ON public.brand_strategy FOR UPDATE
USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own strategy"
ON public.brand_strategy FOR DELETE
USING (auth.uid() = profile_id);

-- Unique constraint: one strategy per user
CREATE UNIQUE INDEX idx_brand_strategy_profile ON public.brand_strategy (profile_id);

-- Auto-update timestamp
CREATE TRIGGER update_brand_strategy_updated_at
BEFORE UPDATE ON public.brand_strategy
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
