-- Limpar dados conflitantes para permitir criação do novo admin
-- Primeiro verificar e limpar qualquer registro órfão relacionado ao email joaoaguiar6089@gmail.com

-- Buscar user_id do email se existir
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Tentar encontrar user_id do email joaoaguiar6089@gmail.com
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'joaoaguiar6089@gmail.com';
    
    -- Se encontrou o user_id, limpar registros órfãos
    IF target_user_id IS NOT NULL THEN
        -- Remover da tabela admin_users se existir
        DELETE FROM public.admin_users WHERE user_id = target_user_id;
        
        -- Remover da tabela profiles se existir
        DELETE FROM public.profiles WHERE user_id = target_user_id;
        
        -- Remover da tabela auth.users se existir
        DELETE FROM auth.users WHERE id = target_user_id;
        
        RAISE NOTICE 'Removidos dados órfãos para user_id: %', target_user_id;
    END IF;
END $$;