-- Critical Security Fixes for Database Functions
-- Add SET search_path = '' to all custom functions to prevent schema injection

-- 1. Update the log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, event_details jsonb DEFAULT '{}'::jsonb, target_user_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    event_type,
    event_details
  ) VALUES (
    COALESCE(target_user_id, auth.uid()),
    event_type,
    event_details
  );
END;
$function$;

-- 2. Update the check_cpf_exists function with better security
CREATE OR REPLACE FUNCTION public.check_cpf_exists(cpf_param text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Validate CPF format first (basic validation)
  IF cpf_param IS NULL OR length(regexp_replace(cpf_param, '[^0-9]', '', 'g')) != 11 THEN
    RETURN false;
  END IF;
  
  -- Clean CPF (remove non-numeric characters)
  cpf_param := regexp_replace(cpf_param, '[^0-9]', '', 'g');
  
  -- Log the CPF check attempt
  INSERT INTO public.security_audit_log (user_id, event_type, event_details, created_at)
  VALUES (auth.uid(), 'cpf_lookup_attempt', 
         jsonb_build_object('cpf_masked', left(cpf_param, 3) || '***' || right(cpf_param, 2)), 
         now());
  
  -- Return if CPF exists
  RETURN EXISTS (
    SELECT 1 FROM public.clients 
    WHERE cpf = cpf_param
  );
END;
$function$;

-- 3. Update authenticate_for_cpf_lookup function
CREATE OR REPLACE FUNCTION public.authenticate_for_cpf_lookup(cpf_param text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Enhanced validation for CPF format
  IF cpf_param IS NULL OR length(regexp_replace(cpf_param, '[^0-9]', '', 'g')) != 11 THEN
    RETURN false;
  END IF;
  
  -- Log authentication attempt
  INSERT INTO public.security_audit_log (user_id, event_type, event_details, created_at)
  VALUES (auth.uid(), 'cpf_auth_attempt', 
         jsonb_build_object('cpf_masked', left(cpf_param, 3) || '***' || right(cpf_param, 2)), 
         now());
  
  RETURN true;
END;
$function$;

-- 4. Create a function to generate secure random passwords for CPF-based accounts
CREATE OR REPLACE FUNCTION public.generate_secure_cpf_password(cpf_param text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  secure_password text;
BEGIN
  -- Generate a secure random password using the CPF as seed but making it unpredictable
  secure_password := encode(digest(cpf_param || current_timestamp::text || random()::text, 'sha256'), 'base64');
  
  -- Return first 16 characters for a reasonably secure password
  RETURN left(secure_password, 16);
END;
$function$;

-- 5. Log this security enhancement
INSERT INTO public.security_audit_log (
  user_id, 
  event_type, 
  event_details, 
  created_at
) VALUES (
  NULL,
  'security_enhancement_applied',
  jsonb_build_object(
    'enhancement', 'database_functions_security_hardening',
    'actions', '["added_search_path_protection", "enhanced_cpf_validation", "improved_logging", "secure_password_generation"]',
    'functions_updated', '["log_security_event", "check_cpf_exists", "authenticate_for_cpf_lookup", "generate_secure_cpf_password"]'
  ),
  now()
);