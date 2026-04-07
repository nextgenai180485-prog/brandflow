
-- 1. Drop dead blotato_api_key column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS blotato_api_key;

-- 2. Lock down media storage buckets (service_role only for writes)
-- brandflow-pv-frames
CREATE POLICY "Only service_role can insert pv-frames"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id != 'brandflow-pv-frames');

CREATE POLICY "Only service_role can update pv-frames"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id != 'brandflow-pv-frames');

CREATE POLICY "Only service_role can delete pv-frames"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id != 'brandflow-pv-frames');

-- brandflow-pv-videos
CREATE POLICY "Only service_role can insert pv-videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id != 'brandflow-pv-videos');

CREATE POLICY "Only service_role can update pv-videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id != 'brandflow-pv-videos');

CREATE POLICY "Only service_role can delete pv-videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id != 'brandflow-pv-videos');

-- brandflow-asv-voice
CREATE POLICY "Only service_role can insert asv-voice"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id != 'brandflow-asv-voice');

CREATE POLICY "Only service_role can update asv-voice"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id != 'brandflow-asv-voice');

CREATE POLICY "Only service_role can delete asv-voice"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id != 'brandflow-asv-voice');

-- brandflow-asv-videos
CREATE POLICY "Only service_role can insert asv-videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id != 'brandflow-asv-videos');

CREATE POLICY "Only service_role can update asv-videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id != 'brandflow-asv-videos');

CREATE POLICY "Only service_role can delete asv-videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id != 'brandflow-asv-videos');

-- 3. Tighten RLS from public to authenticated on all user-facing tables

-- campaigns
DROP POLICY IF EXISTS "Users can create their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.campaigns;

CREATE POLICY "Users can view their own campaigns" ON public.campaigns FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users can create their own campaigns" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own campaigns" ON public.campaigns FOR UPDATE TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own campaigns" ON public.campaigns FOR DELETE TO authenticated USING (auth.uid() = profile_id);

-- generated_assets
DROP POLICY IF EXISTS "Users can create their own assets" ON public.generated_assets;
DROP POLICY IF EXISTS "Users can delete their own assets" ON public.generated_assets;
DROP POLICY IF EXISTS "Users can update their own assets" ON public.generated_assets;
DROP POLICY IF EXISTS "Users can view their own assets" ON public.generated_assets;

CREATE POLICY "Users can view their own assets" ON public.generated_assets FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users can create their own assets" ON public.generated_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own assets" ON public.generated_assets FOR UPDATE TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own assets" ON public.generated_assets FOR DELETE TO authenticated USING (auth.uid() = profile_id);

-- brand_assets
DROP POLICY IF EXISTS "Users can create their own brand assets" ON public.brand_assets;
DROP POLICY IF EXISTS "Users can delete their own brand assets" ON public.brand_assets;
DROP POLICY IF EXISTS "Users can update their own brand assets" ON public.brand_assets;
DROP POLICY IF EXISTS "Users can view their own brand assets" ON public.brand_assets;

CREATE POLICY "Users can view their own brand assets" ON public.brand_assets FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users can create their own brand assets" ON public.brand_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own brand assets" ON public.brand_assets FOR UPDATE TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own brand assets" ON public.brand_assets FOR DELETE TO authenticated USING (auth.uid() = profile_id);

-- profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- campaign_research
DROP POLICY IF EXISTS "Users can create their own research" ON public.campaign_research;
DROP POLICY IF EXISTS "Users can delete their own research" ON public.campaign_research;
DROP POLICY IF EXISTS "Users can update their own research" ON public.campaign_research;
DROP POLICY IF EXISTS "Users can view their own research" ON public.campaign_research;

CREATE POLICY "Users can view their own research" ON public.campaign_research FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users can create their own research" ON public.campaign_research FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own research" ON public.campaign_research FOR UPDATE TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own research" ON public.campaign_research FOR DELETE TO authenticated USING (auth.uid() = profile_id);

-- decision_traces
DROP POLICY IF EXISTS "Users can create their own traces" ON public.decision_traces;
DROP POLICY IF EXISTS "Users can delete their own traces" ON public.decision_traces;
DROP POLICY IF EXISTS "Users can view their own traces" ON public.decision_traces;

CREATE POLICY "Users can view their own traces" ON public.decision_traces FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users can create their own traces" ON public.decision_traces FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own traces" ON public.decision_traces FOR DELETE TO authenticated USING (auth.uid() = profile_id);

-- brand_memory
DROP POLICY IF EXISTS "Users can create their own memory" ON public.brand_memory;
DROP POLICY IF EXISTS "Users can delete their own memory" ON public.brand_memory;
DROP POLICY IF EXISTS "Users can update their own memory" ON public.brand_memory;
DROP POLICY IF EXISTS "Users can view their own memory" ON public.brand_memory;

CREATE POLICY "Users can view their own memory" ON public.brand_memory FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users can create their own memory" ON public.brand_memory FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own memory" ON public.brand_memory FOR UPDATE TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own memory" ON public.brand_memory FOR DELETE TO authenticated USING (auth.uid() = profile_id);

-- brand_strategy
DROP POLICY IF EXISTS "Users can create their own strategy" ON public.brand_strategy;
DROP POLICY IF EXISTS "Users can delete their own strategy" ON public.brand_strategy;
DROP POLICY IF EXISTS "Users can update their own strategy" ON public.brand_strategy;
DROP POLICY IF EXISTS "Users can view their own strategy" ON public.brand_strategy;

CREATE POLICY "Users can view their own strategy" ON public.brand_strategy FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users can create their own strategy" ON public.brand_strategy FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own strategy" ON public.brand_strategy FOR UPDATE TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own strategy" ON public.brand_strategy FOR DELETE TO authenticated USING (auth.uid() = profile_id);

-- campaign_assets
DROP POLICY IF EXISTS "Users can create their own campaign assets" ON public.campaign_assets;
DROP POLICY IF EXISTS "Users can delete their own campaign assets" ON public.campaign_assets;
DROP POLICY IF EXISTS "Users can update their own campaign assets" ON public.campaign_assets;
DROP POLICY IF EXISTS "Users can view their own campaign assets" ON public.campaign_assets;

CREATE POLICY "Users can view their own campaign assets" ON public.campaign_assets FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users can create their own campaign assets" ON public.campaign_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update their own campaign assets" ON public.campaign_assets FOR UPDATE TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own campaign assets" ON public.campaign_assets FOR DELETE TO authenticated USING (auth.uid() = profile_id);

-- cmo_chat_messages
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON public.cmo_chat_messages;
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON public.cmo_chat_messages;
DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.cmo_chat_messages;

CREATE POLICY "Users can view their own chat messages" ON public.cmo_chat_messages FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert their own chat messages" ON public.cmo_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own chat messages" ON public.cmo_chat_messages FOR DELETE TO authenticated USING (auth.uid() = profile_id);
