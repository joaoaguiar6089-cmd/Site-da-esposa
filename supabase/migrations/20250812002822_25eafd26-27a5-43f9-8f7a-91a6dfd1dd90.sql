-- Corrigir vulnerabilidade de segurança na tabela clients
-- Remove política insegura e cria função segura para verificação de CPF

-- 1. Remover a política insegura que permite acesso público aos dados dos clientes
DROP POLICY IF EXISTS "Allow CPF existence check for login" ON public.clients;

-- 2. Criar função segura para verificar apenas a existência de CPF
CREATE OR REPLACE FUNCTION public.check_cpf_exists(cpf_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Apenas retorna se o CPF existe, sem expor dados sensíveis
  RETURN EXISTS (
    SELECT 1 FROM public.clients 
    WHERE cpf = cpf_param
  );
END;
$$;

-- 3. Remover também a política insegura de appointments que permite acesso sem autenticação
DROP POLICY IF EXISTS "Allow CPF-based appointment viewing" ON public.appointments;

-- 4. Log da correção de segurança
INSERT INTO public.security_audit_log (
  user_id, 
  event_type, 
  event_details, 
  created_at
) VALUES (
  NULL,
  'security_vulnerability_fixed',
  jsonb_build_object(
    'vulnerability', 'public_client_data_access',
    'action', 'removed_insecure_rls_policies',
    'tables_affected', '["clients", "appointments"]'
  ),
  now()
);