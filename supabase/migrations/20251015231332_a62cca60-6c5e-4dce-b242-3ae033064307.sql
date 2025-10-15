-- Remover usuário anterior inválido
DELETE FROM public.admin_users WHERE email = 'enfesteta.karoline@resumo.local';
DELETE FROM public.profiles WHERE role = 'resumo';
DELETE FROM auth.users WHERE email = 'enfesteta.karoline@resumo.local';

-- Nota: O usuário deve ser criado via signup normal do Supabase Auth
-- Não podemos criar usuários com senhas custom diretamente no banco
-- A senha deve ser definida via Auth API ou manualmente no dashboard

-- Criar entrada na tabela profiles para quando o usuário for criado
-- Vamos usar um approach diferente: permitir que qualquer admin acesse o resumo
-- ou criar um sistema de autenticação simples sem usar auth.users

-- Opção: Criar tabela de autenticação customizada para resumo
CREATE TABLE IF NOT EXISTS public.resumo_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Criar função para verificar credenciais de resumo
CREATE OR REPLACE FUNCTION public.verify_resumo_credentials(
  p_username TEXT,
  p_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.resumo_credentials 
    WHERE username = p_username 
    AND password_hash = crypt(p_password, password_hash)
    AND is_active = true
  );
END;
$$;

-- Inserir credenciais de resumo
-- Usuário: enfesteta.karoline
-- Senha: maedecurumins2026
INSERT INTO public.resumo_credentials (username, password_hash, is_active)
VALUES ('enfesteta.karoline', crypt('maedecurumins2026', gen_salt('bf')), true)
ON CONFLICT (username) DO UPDATE SET
  password_hash = crypt('maedecurumins2026', gen_salt('bf')),
  is_active = true;

-- Função para registrar login bem-sucedido
CREATE OR REPLACE FUNCTION public.log_resumo_login(p_username TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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