
CREATE TABLE public.cmo_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cmo_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat messages" ON public.cmo_chat_messages FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert their own chat messages" ON public.cmo_chat_messages FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can delete their own chat messages" ON public.cmo_chat_messages FOR DELETE USING (auth.uid() = profile_id);

CREATE INDEX idx_cmo_chat_messages_profile ON public.cmo_chat_messages(profile_id, created_at);
