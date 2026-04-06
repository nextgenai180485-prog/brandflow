
-- Junction table: campaign → brand_asset references
CREATE TABLE public.campaign_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  brand_asset_id UUID NOT NULL REFERENCES public.brand_assets(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL,
  asset_role TEXT NOT NULL DEFAULT 'reference',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, brand_asset_id)
);

-- Enable RLS
ALTER TABLE public.campaign_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaign assets"
  ON public.campaign_assets FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can create their own campaign assets"
  ON public.campaign_assets FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own campaign assets"
  ON public.campaign_assets FOR DELETE
  USING (auth.uid() = profile_id);

-- Index for fast lookups
CREATE INDEX idx_campaign_assets_campaign ON public.campaign_assets(campaign_id);
CREATE INDEX idx_campaign_assets_brand_asset ON public.campaign_assets(brand_asset_id);
