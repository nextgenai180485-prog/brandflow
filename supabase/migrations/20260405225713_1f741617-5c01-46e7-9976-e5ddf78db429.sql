
ALTER TABLE public.campaigns
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN publish_platforms TEXT[] DEFAULT '{}';
