-- Verificar e habilitar extensão pgcrypto no schema correto
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- Dropar e recriar tudo com hash SHA256 (mais simples e confiável)
DROP TABLE IF EXISTS public.resumo_credentials CASCADE;
DROP FUNCTION IF EXISTS public.verify_resumo_credentials(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.log_resumo_login(TEXT) CASCADE;

CREATE TABLE public.resumo_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Criar função de verificação usando encode/digest (SHA256)
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
  v_stored_hash TEXT;
  v_computed_hash TEXT;
BEGIN
  -- Buscar hash armazenado
  SELECT password_hash INTO v_stored_hash
  FROM public.resumo_credentials
  WHERE username = p_username AND is_active = true;
  
  IF v_stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Computar hash da senha fornecida
  v_computed_hash := encode(digest(p_password, 'sha256'), 'hex');
  
  -- Comparar hashes
  RETURN v_stored_hash = v_computed_hash;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in verify_resumo_credentials: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Inserir credencial com hash SHA256
-- Usuário: enfesteta.karoline
-- Senha: maedecurumins2026
INSERT INTO public.resumo_credentials (username, password_hash, is_active)
VALUES (
  'enfesteta.karoline', 
  encode(digest('maedecurumins2026', 'sha256'), 'hex'),
  true
);

-- Recriar função de log
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
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in log_resumo_login: %', SQLERRM;
END;
$$;