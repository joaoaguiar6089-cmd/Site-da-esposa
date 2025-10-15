-- Atualizar constraint de roles na tabela profiles para incluir 'resumo'
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS valid_roles;

ALTER TABLE public.profiles 
ADD CONSTRAINT valid_roles CHECK (role IN ('admin', 'client', 'resumo'));

-- Criar usuário para área de resumo
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Criar usuário no auth.users se não existir
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'enfesteta.karoline@resumo.local',
    crypt('maedecurumins2026', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    ''
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'enfesteta.karoline@resumo.local'
  )
  RETURNING id INTO v_user_id;

  -- Se o usuário já existia, pegar o ID
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'enfesteta.karoline@resumo.local';
  END IF;

  -- Criar perfil se não existir
  INSERT INTO public.profiles (user_id, role, created_at, updated_at)
  VALUES (v_user_id, 'resumo', NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE SET role = 'resumo', updated_at = NOW();

  -- Adicionar entrada na tabela admin_users para permissões
  INSERT INTO public.admin_users (
    user_id, 
    is_active, 
    email, 
    email_notifications, 
    created_at
  )
  VALUES (v_user_id, true, 'enfesteta.karoline@resumo.local', false, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    is_active = true,
    email = 'enfesteta.karoline@resumo.local';

END $$;

-- Criar função para verificar acesso à área de resumo
CREATE OR REPLACE FUNCTION public.check_resumo_access(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = user_id_param 
    AND role = 'resumo'
  );
$$;

-- Criar função auxiliar para ser usada em RLS
CREATE OR REPLACE FUNCTION public.is_resumo_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.check_resumo_access(auth.uid());
$$;