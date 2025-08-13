-- Atualizar o trigger para aceitar múltiplos emails de admin
CREATE OR REPLACE FUNCTION public.create_admin_after_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Verificar se é um dos emails de admin especificados
  IF NEW.email IN ('joaoaguiar6089@gmail.com', 'enfesteta.karoline@gmail.com', 'j.paguiar@icloud.com') THEN
    -- Inserir perfil admin se não existir
    INSERT INTO public.profiles (user_id, role, created_at, updated_at)
    VALUES (NEW.id, 'admin', now(), now())
    ON CONFLICT (user_id) DO UPDATE SET
      role = 'admin',
      updated_at = now();
    
    -- Inserir privilégios admin se não existir
    INSERT INTO public.admin_users (user_id, is_active, email, email_notifications, created_at)
    VALUES (NEW.id, true, NEW.email, true, now())
    ON CONFLICT (user_id) DO UPDATE SET
      is_active = true,
      email = NEW.email,
      email_notifications = true;
      
    -- Log do evento de segurança
    INSERT INTO public.security_audit_log (user_id, event_type, event_details, created_at)
    VALUES (NEW.id, 'admin_user_created', 
           jsonb_build_object('email', NEW.email), 
           now());
  END IF;
  
  RETURN NEW;
END;
$function$;