-- Vamos criar um novo usuário admin com credenciais simples
-- Deletar o usuário atual se existir
DELETE FROM public.admin_users WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joaoaguiar6089@gmail.com');
DELETE FROM public.profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joaoaguiar6089@gmail.com');
DELETE FROM auth.users WHERE email = 'joaoaguiar6089@gmail.com';

-- Inserir novo usuário admin diretamente
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'admin@clinica.com',
    crypt('123456', gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '',
    '',
    ''
);

-- Inserir perfil admin
INSERT INTO public.profiles (user_id, cpf, role, created_at, updated_at)
SELECT 
    u.id,
    '47164591873',
    'admin',
    now(),
    now()
FROM auth.users u 
WHERE u.email = 'admin@clinica.com';

-- Inserir privilégios admin
INSERT INTO public.admin_users (user_id, is_active, created_at)
SELECT 
    u.id,
    true,
    now()
FROM auth.users u 
WHERE u.email = 'admin@clinica.com';