
ALTER TABLE public.generated_assets
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS format TEXT;
