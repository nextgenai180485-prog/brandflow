
-- social_accounts: cached Blotato account data
CREATE TABLE public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  blotato_account_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  auto_publish BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'connected',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, blotato_account_id)
);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own social accounts"
  ON public.social_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can create their own social accounts"
  ON public.social_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own social accounts"
  ON public.social_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own social accounts"
  ON public.social_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE TRIGGER update_social_accounts_updated_at
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- publish_records: tracks every publish attempt
CREATE TABLE public.publish_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  asset_id UUID NOT NULL,
  campaign_id UUID,
  social_account_id UUID REFERENCES public.social_accounts(id),
  platform TEXT NOT NULL,
  blotato_post_submission_id TEXT,
  status TEXT DEFAULT 'queued',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_post_url TEXT,
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.publish_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own publish records"
  ON public.publish_records FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can create their own publish records"
  ON public.publish_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own publish records"
  ON public.publish_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own publish records"
  ON public.publish_records FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE INDEX idx_social_accounts_profile ON public.social_accounts(profile_id);
CREATE INDEX idx_publish_records_profile ON public.publish_records(profile_id);
CREATE INDEX idx_publish_records_status ON public.publish_records(status);
CREATE INDEX idx_publish_records_scheduled ON public.publish_records(scheduled_at) WHERE status = 'scheduled';
