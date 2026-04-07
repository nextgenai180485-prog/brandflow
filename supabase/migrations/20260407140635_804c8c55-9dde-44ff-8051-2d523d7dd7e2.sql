INSERT INTO public.user_roles (user_id, role)
VALUES ('6e45ca02-f764-4ab1-9810-c07990ac37cb', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;