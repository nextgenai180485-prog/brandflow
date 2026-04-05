
-- Extend profiles table for onboarding
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS industry text DEFAULT 'medspa',
ADD COLUMN IF NOT EXISTS brand_colors jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS brand_voice_tone text,
ADD COLUMN IF NOT EXISTS brand_voice_keywords text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_audience text,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0;

-- Create brand_assets table
CREATE TABLE public.brand_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL,
  asset_type text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for brand_assets
CREATE POLICY "Users can view their own brand assets"
ON public.brand_assets FOR SELECT
USING (auth.uid() = profile_id);

CREATE POLICY "Users can create their own brand assets"
ON public.brand_assets FOR INSERT
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own brand assets"
ON public.brand_assets FOR UPDATE
USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own brand assets"
ON public.brand_assets FOR DELETE
USING (auth.uid() = profile_id);
