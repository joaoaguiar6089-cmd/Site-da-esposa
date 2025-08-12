-- Criar admin joaoaguiar6089@gmail.com diretamente no banco
-- Gerar novo UUID e inserir todos os dados necessários

DO $$
DECLARE
    new_user_id uuid := gen_random_uuid();
BEGIN
    -- Inserir na tabela auth.users
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
        new_user_id,
        '00000000-0000-0000-0000-000000000000'::uuid,
        'joaoaguiar6089@gmail.com',
        crypt('Jp31163299', gen_salt('bf')),
        now(),
        now(),
        now(),
        null,
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        false,
        'authenticated'
    );

    -- Inserir perfil admin
    INSERT INTO public.profiles (user_id, cpf, role, created_at, updated_at)
    VALUES (new_user_id, '47164591873', 'admin', now(), now());

    -- Inserir privilégios admin
    INSERT INTO public.admin_users (user_id, is_active, created_at)
    VALUES (new_user_id, true, now());

    -- Log do evento
    INSERT INTO public.security_audit_log (user_id, event_type, event_details, created_at)
    VALUES (new_user_id, 'admin_user_created', 
           jsonb_build_object('email', 'joaoaguiar6089@gmail.com', 'cpf', '47164591873', 'created_by', 'migration'), 
           now());

    RAISE NOTICE 'Admin criado com sucesso - user_id: %', new_user_id;
END $$;