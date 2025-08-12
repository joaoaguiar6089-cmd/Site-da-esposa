-- Conectar o usuário existente joaoaguiar6089@gmail.com como admin
-- Ele já existe no auth mas não tem perfil admin

DO $$
DECLARE
    existing_user_id uuid;
BEGIN
    -- Buscar o user_id existente
    SELECT id INTO existing_user_id FROM auth.users WHERE email = 'joaoaguiar6089@gmail.com';
    
    IF existing_user_id IS NOT NULL THEN
        -- Inserir ou atualizar perfil admin
        INSERT INTO public.profiles (user_id, cpf, role, created_at, updated_at)
        VALUES (existing_user_id, '47164591873', 'admin', now(), now())
        ON CONFLICT (user_id) DO UPDATE SET
            cpf = '47164591873',
            role = 'admin',
            updated_at = now();

        -- Inserir privilégios admin se não existir
        INSERT INTO public.admin_users (user_id, is_active, created_at)
        VALUES (existing_user_id, true, now())
        ON CONFLICT (user_id) DO UPDATE SET
            is_active = true;

        -- Log do evento
        INSERT INTO public.security_audit_log (user_id, event_type, event_details, created_at)
        VALUES (existing_user_id, 'admin_user_connected', 
               jsonb_build_object('email', 'joaoaguiar6089@gmail.com', 'cpf', '47164591873'), 
               now());

        RAISE NOTICE 'Admin conectado com sucesso - user_id: %', existing_user_id;
    ELSE
        RAISE EXCEPTION 'Usuário não encontrado';
    END IF;
END $$;