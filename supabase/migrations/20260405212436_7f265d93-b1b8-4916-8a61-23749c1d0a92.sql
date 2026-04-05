
-- Create the campaign_assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign_assets', 'campaign_assets', true);

-- Anyone authenticated can view all files in the bucket
CREATE POLICY "Campaign assets are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'campaign_assets');

-- Users can upload files to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'campaign_assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own files
CREATE POLICY "Users can update their own campaign assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'campaign_assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files
CREATE POLICY "Users can delete their own campaign assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'campaign_assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
