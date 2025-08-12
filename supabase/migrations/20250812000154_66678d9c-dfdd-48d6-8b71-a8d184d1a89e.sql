-- Vou verificar se há problemas com a configuração do auth
-- Primeiro, vou verificar se o usuário pode ser autenticado corretamente
-- Vamos tentar uma abordagem diferente: resetar completamente o usuário

-- Deletar usuário atual
DELETE FROM public.admin_users WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@clinica.com');
DELETE FROM public.profiles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@clinica.com');
DELETE FROM auth.users WHERE email = 'admin@clinica.com';

-- Criar usuário com hash mais simples e configuração completa
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'admin@clinica.com',
    crypt('123456', gen_salt('bf')),
    now(),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    'authenticated'
);

-- Inserir perfil
INSERT INTO public.profiles (user_id, cpf, role, created_at, updated_at)
SELECT 
    u.id,
    '47164591873',
    'admin',
    now(),
    now()
FROM auth.users u 
WHERE u.email = 'admin@clinica.com';

-- Inserir admin
INSERT INTO public.admin_users (user_id, is_active, created_at)
SELECT 
    u.id,
    true,
    now()
FROM auth.users u 
WHERE u.email = 'admin@clinica.com';