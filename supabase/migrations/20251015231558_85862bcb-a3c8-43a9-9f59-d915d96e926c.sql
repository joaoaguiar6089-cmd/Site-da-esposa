-- Habilitar extensão pgcrypto se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recriar a tabela de credenciais com hash correto
DROP TABLE IF EXISTS public.resumo_credentials CASCADE;

CREATE TABLE public.resumo_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Recriar função para verificar credenciais
CREATE OR REPLACE FUNCTION public.verify_resumo_credentials(
  p_username TEXT,
  p_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.resumo_credentials 
    WHERE username = p_username 
    AND password_hash = crypt(p_password, password_hash)
    AND is_active = true
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in verify_resumo_credentials: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Inserir credenciais
-- Usuário: enfesteta.karoline
-- Senha: maedecurumins2026
INSERT INTO public.resumo_credentials (username, password_hash, is_active)
VALUES ('enfesteta.karoline', crypt('maedecurumins2026', gen_salt('bf')), true);

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