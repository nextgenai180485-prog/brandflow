-- Add missing UPDATE policies for enterprise-grade RLS coverage
CREATE POLICY "Users can update their own campaign assets"
ON public.campaign_assets
FOR UPDATE
TO public
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own research"
ON public.campaign_research
FOR UPDATE
TO public
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);