-- Criar tabela simples para autenticação de resumo
DROP TABLE IF EXISTS public.resumo_credentials CASCADE;
DROP FUNCTION IF EXISTS public.verify_resumo_credentials(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.log_resumo_login(TEXT) CASCADE;

CREATE TABLE public.resumo_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Função de verificação simples
CREATE OR REPLACE FUNCTION public.verify_resumo_credentials(
  p_username TEXT,
  p_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stored_password TEXT;
BEGIN
  SELECT password INTO v_stored_password
  FROM public.resumo_credentials
  WHERE username = p_username AND is_active = true;
  
  RETURN v_stored_password IS NOT NULL AND v_stored_password = p_password;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Inserir credencial
INSERT INTO public.resumo_credentials (username, password, is_active)
VALUES ('enfesteta.karoline', 'maedecurumins2026', true);

-- Função de log
CREATE OR REPLACE FUNCTION public.log_resumo_login(p_username TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.resumo_credentials 
  SET last_login = NOW() 
  WHERE username = p_username;
  
  INSERT INTO public.security_audit_log (
    user_id, 
    event_type, 
    event_details, 
    created_at
  ) VALUES (
    NULL,
    'resumo_login',
    jsonb_build_object('username', p_username),
    NOW()
  );
END;
$$;