-- Corrigir o problema de enfesteta.karoline@gmail.com
-- Primeiro vamos criar o profile se não existe
INSERT INTO public.profiles (user_id, role, created_at, updated_at)
VALUES ('2f910934-4c61-46bd-b4a5-5ee5a8dc5553', 'admin', now(), now())
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  updated_at = now();

-- Depois criar o registro admin_users
INSERT INTO public.admin_users (user_id, is_active, email, email_notifications, created_at)
VALUES ('2f910934-4c61-46bd-b4a5-5ee5a8dc5553', true, 'enfesteta.karoline@gmail.com', true, now())
ON CONFLICT (user_id) DO UPDATE SET
  is_active = true,
  email = 'enfesteta.karoline@gmail.com',
  email_notifications = true;