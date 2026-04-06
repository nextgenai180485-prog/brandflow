
-- ═══════════════════════════════════════════════════
-- Phase 1: Creative Director Database Tables
-- ═══════════════════════════════════════════════════

-- 1. video_templates — curated template library for generation families
CREATE TABLE public.video_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family TEXT NOT NULL CHECK (family IN ('F1_UGC', 'F2_SPOKESPERSON', 'F5_CINEMATIC')),
  template_name TEXT NOT NULL,
  sealcam_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  hook_type TEXT,
  duration_s INTEGER NOT NULL DEFAULT 15,
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  mood TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  example_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.video_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active templates"
  ON public.video_templates FOR SELECT TO authenticated
  USING (is_active = true);

CREATE INDEX idx_video_templates_family ON public.video_templates(family);
CREATE INDEX idx_video_templates_tags ON public.video_templates USING GIN(tags);

-- 2. hooks — proven hook formulas per platform and family
CREATE TABLE public.hooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hook_text TEXT NOT NULL,
  hook_type TEXT NOT NULL DEFAULT 'question',
  family TEXT,
  platform TEXT,
  effectiveness_score NUMERIC NOT NULL DEFAULT 0.5,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read hooks"
  ON public.hooks FOR SELECT TO authenticated
  USING (true);

CREATE INDEX idx_hooks_family_platform ON public.hooks(family, platform);
CREATE INDEX idx_hooks_type ON public.hooks(hook_type);

-- 3. creative_history — user's creative direction history per campaign
CREATE TABLE public.creative_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  family TEXT NOT NULL,
  sealcam_scenes JSONB NOT NULL DEFAULT '[]'::jsonb,
  direction_output JSONB NOT NULL DEFAULT '{}'::jsonb,
  generation_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_status TEXT NOT NULL DEFAULT 'pending',
  user_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creative_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own creative history"
  ON public.creative_history FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can create their own creative history"
  ON public.creative_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own creative history"
  ON public.creative_history FOR UPDATE TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own creative history"
  ON public.creative_history FOR DELETE TO authenticated
  USING (auth.uid() = profile_id);

CREATE INDEX idx_creative_history_profile ON public.creative_history(profile_id);
CREATE INDEX idx_creative_history_campaign ON public.creative_history(campaign_id);

-- 4. asset_memory — learned style preferences from user feedback
CREATE TABLE public.asset_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  asset_id UUID,
  memory_type TEXT NOT NULL DEFAULT 'style_preference',
  pattern_key TEXT NOT NULL,
  pattern_value TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  frequency INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own asset memory"
  ON public.asset_memory FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can create their own asset memory"
  ON public.asset_memory FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own asset memory"
  ON public.asset_memory FOR UPDATE TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own asset memory"
  ON public.asset_memory FOR DELETE TO authenticated
  USING (auth.uid() = profile_id);

CREATE INDEX idx_asset_memory_profile ON public.asset_memory(profile_id);
CREATE INDEX idx_asset_memory_type ON public.asset_memory(memory_type);

-- Triggers for updated_at
CREATE TRIGGER update_video_templates_updated_at BEFORE UPDATE ON public.video_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hooks_updated_at BEFORE UPDATE ON public.hooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creative_history_updated_at BEFORE UPDATE ON public.creative_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asset_memory_updated_at BEFORE UPDATE ON public.asset_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
