-- Corrigir as políticas RLS que estão bloqueando o acesso

-- 1. Permitir que usuários não autenticados vejam agendamentos por CPF (para listagem inicial)
CREATE POLICY "Allow unauthenticated CPF appointment lookup" 
ON public.appointments 
FOR SELECT 
USING (
  auth.uid() IS NULL AND 
  client_id IN (SELECT id FROM clients WHERE cpf = ANY(string_to_array(current_setting('request.headers', true)::json->>'x-cpf', ',')))
);

-- 2. Simplificar política de profissionais para permitir visualização geral
DROP POLICY IF EXISTS "Clients can view professionals for their appointments" ON public.professionals;
DROP POLICY IF EXISTS "Unauthenticated can view basic professional info" ON public.professionals;

CREATE POLICY "Anyone can view professionals for appointments" 
ON public.professionals 
FOR SELECT 
USING (true);

-- 3. Permitir que usuários não autenticados vejam procedimentos 
CREATE POLICY "Anyone can view procedures" 
ON public.procedures 
FOR SELECT 
USING (true);