
-- Character Library for F2 Spokesperson presets
CREATE TABLE public.character_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  voice_style TEXT DEFAULT 'professional',
  persona_traits JSONB NOT NULL DEFAULT '{}'::jsonb,
  gender TEXT DEFAULT 'neutral',
  age_range TEXT DEFAULT '25-35',
  ethnicity_tags TEXT[] DEFAULT '{}'::text[],
  compatible_families TEXT[] NOT NULL DEFAULT '{F2_spokesperson}'::text[],
  mood_tags TEXT[] DEFAULT '{}'::text[],
  industry_tags TEXT[] DEFAULT '{}'::text[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.character_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active characters"
  ON public.character_library FOR SELECT TO authenticated
  USING (is_active = true);

CREATE INDEX idx_character_library_industry ON public.character_library USING GIN (industry_tags);
CREATE INDEX idx_character_library_mood ON public.character_library USING GIN (mood_tags);
CREATE INDEX idx_character_library_active ON public.character_library (is_active);

CREATE TRIGGER update_character_library_updated_at
  BEFORE UPDATE ON public.character_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ad & Asset Reference Library for Creative Cloner (F8)
CREATE TABLE public.ad_reference_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'image',
  thumbnail_url TEXT,
  industry_tags TEXT[] DEFAULT '{}'::text[],
  mood_tags TEXT[] DEFAULT '{}'::text[],
  platform_tags TEXT[] DEFAULT '{}'::text[],
  performance_notes TEXT,
  sealcam_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  compatible_families TEXT[] NOT NULL DEFAULT '{F8_creative_cloner}'::text[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_reference_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active ad references"
  ON public.ad_reference_library FOR SELECT TO authenticated
  USING (is_active = true);

CREATE INDEX idx_ad_reference_industry ON public.ad_reference_library USING GIN (industry_tags);
CREATE INDEX idx_ad_reference_platform ON public.ad_reference_library USING GIN (platform_tags);
CREATE INDEX idx_ad_reference_active ON public.ad_reference_library (is_active);

CREATE TRIGGER update_ad_reference_library_updated_at
  BEFORE UPDATE ON public.ad_reference_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for library assets (character avatars, ad reference media)
INSERT INTO storage.buckets (id, name, public)
VALUES ('library-assets', 'library-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for library assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'library-assets');

CREATE POLICY "Service role can manage library assets"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'library-assets')
  WITH CHECK (bucket_id = 'library-assets');
