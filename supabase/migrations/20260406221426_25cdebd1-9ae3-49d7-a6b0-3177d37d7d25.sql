CREATE TABLE public.image_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  style_name TEXT NOT NULL,
  vertical TEXT NOT NULL DEFAULT 'general',
  platform TEXT DEFAULT NULL,
  format TEXT DEFAULT NULL,
  style_guide JSONB NOT NULL DEFAULT '{}'::jsonb,
  prompt_modifiers TEXT[] NOT NULL DEFAULT '{}'::text[],
  negative_prompt TEXT NOT NULL DEFAULT 'blurry, low quality, distorted, watermark, text overlay, amateur, clipart, cartoon, illustration, 3D render, stock photo feel',
  quality_tier TEXT NOT NULL DEFAULT 'standard',
  tags TEXT[] DEFAULT '{}'::text[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.image_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active image templates"
  ON public.image_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE TRIGGER update_image_templates_updated_at
  BEFORE UPDATE ON public.image_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();