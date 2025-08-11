-- Criar usuário administrador
-- Primeiro, vamos inserir na tabela auth.users (simulando o registro)
-- Como não podemos inserir diretamente em auth.users, vamos usar uma abordagem diferente
-- Vamos criar o perfil admin e a entrada admin_users para o usuário que se registrará

-- Inserir o perfil admin para o usuário que se registrará com o email especificado
-- O user_id será preenchido quando o usuário se registrar
INSERT INTO public.profiles (user_id, cpf, role, created_at, updated_at)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'joaoaguiar6089@gmail.com' LIMIT 1),
    '47164591873',
    'admin',
    now(),
    now()
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE cpf = '47164591873'
);

-- Inserir na tabela admin_users para dar privilégios administrativos
INSERT INTO public.admin_users (user_id, is_active, created_at)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'joaoaguiar6089@gmail.com' LIMIT 1),
    true,
    now()
WHERE EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'joaoaguiar6089@gmail.com'
) AND NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'joaoaguiar6089@gmail.com' LIMIT 1)
);

-- Função para criar admin após registro
CREATE OR REPLACE FUNCTION public.create_admin_after_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se é o email do admin especificado
  IF NEW.email = 'joaoaguiar6089@gmail.com' THEN
    -- Inserir perfil admin se não existir
    INSERT INTO public.profiles (user_id, cpf, role, created_at, updated_at)
    VALUES (NEW.id, '47164591873', 'admin', now(), now())
    ON CONFLICT (user_id) DO UPDATE SET
      cpf = '47164591873',
      role = 'admin',
      updated_at = now();
    
    -- Inserir privilégios admin se não existir
    INSERT INTO public.admin_users (user_id, is_active, created_at)
    VALUES (NEW.id, true, now())
    ON CONFLICT (user_id) DO UPDATE SET
      is_active = true;
      
    -- Log do evento de segurança
    INSERT INTO public.security_audit_log (user_id, event_type, event_details, created_at)
    VALUES (NEW.id, 'admin_user_created', 
           jsonb_build_object('email', NEW.email, 'cpf', '47164591873'), 
           now());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;