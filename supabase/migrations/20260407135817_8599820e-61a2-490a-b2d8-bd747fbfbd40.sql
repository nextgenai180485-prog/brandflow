
INSERT INTO public.user_roles (user_id, role)
VALUES ('9e6067c5-5019-47c2-93c7-f0b6a05b5eca', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
