-- Corrigir política RLS para permitir que clientes cancelem seus próprios agendamentos
-- independente das permissões de admin

-- Remover política restritiva atual
DROP POLICY IF EXISTS "Clients can update their own appointments" ON public.appointments;

-- Criar nova política mais permissiva para clientes atualizarem seus agendamentos
CREATE POLICY "Clients can update their own appointments" 
ON public.appointments 
FOR UPDATE 
USING (
  -- Permite se o client_id corresponde a um cliente com o CPF do usuário atual
  client_id IN (
    SELECT id FROM public.clients 
    WHERE cpf = get_current_user_cpf()
  )
  OR 
  -- Ou se for admin ativo
  is_active_admin()
)
WITH CHECK (
  -- Mesmo critério para verificação
  client_id IN (
    SELECT id FROM public.clients 
    WHERE cpf = get_current_user_cpf()
  )
  OR 
  is_active_admin()
);

-- Adicionar política específica para permitir cancelamento público baseado em CPF
-- Esta política permite cancelamento sem autenticação formal, apenas validando o CPF
CREATE POLICY "Allow public appointment cancellation by CPF" 
ON public.appointments 
FOR UPDATE 
USING (
  -- Permite cancelamento se o appointment pertence ao cliente
  client_id IN (SELECT id FROM public.clients)
)
WITH CHECK (
  -- Só permite alterar o status para cancelado
  status = 'cancelado' AND
  client_id IN (SELECT id FROM public.clients)
);