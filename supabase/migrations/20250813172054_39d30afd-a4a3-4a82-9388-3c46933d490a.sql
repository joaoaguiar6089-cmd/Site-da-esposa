-- Enable pgcrypto extension for cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the generate_secure_cpf_password function to use a simpler approach
CREATE OR REPLACE FUNCTION public.generate_secure_cpf_password(cpf_param text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  secure_password text;
  random_part text;
BEGIN
  -- Generate random components
  random_part := encode(digest(cpf_param || extract(epoch from now())::text || random()::text, 'sha256'), 'hex');
  
  -- Create a secure password from the hash (first 16 characters)
  secure_password := left(random_part, 16);
  
  RETURN secure_password;
END;
$function$;