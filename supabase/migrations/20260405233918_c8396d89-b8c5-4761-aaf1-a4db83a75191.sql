ALTER TABLE public.profiles
ADD COLUMN brand_palette jsonb DEFAULT '{}'::jsonb;