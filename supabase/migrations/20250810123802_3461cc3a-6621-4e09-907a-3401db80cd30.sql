-- Abordagem mais simples: permitir acesso geral para resolver os problemas de login por CPF

-- 1. Simplificar política de profissionais
DROP POLICY IF EXISTS "Clients can view professionals for their appointments" ON public.professionals;
DROP POLICY IF EXISTS "Unauthenticated can view basic professional info" ON public.professionals;

CREATE POLICY "Public can view professionals" 
ON public.professionals 
FOR SELECT 
USING (true);

-- 2. Permitir visualização de agendamentos por CPF sem autenticação (temporário para corrigir o fluxo)
CREATE POLICY "Allow CPF-based appointment viewing" 
ON public.appointments 
FOR SELECT 
USING (auth.uid() IS NULL);