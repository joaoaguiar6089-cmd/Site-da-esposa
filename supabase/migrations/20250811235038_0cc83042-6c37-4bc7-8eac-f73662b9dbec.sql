-- Criar trigger para configurar automaticamente o usuário admin
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;

CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_admin_after_signup();

-- Corrigir as funções com search_path adequado para melhorar a segurança
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';