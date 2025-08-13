-- Criar política para permitir acesso público aos profissionais na área de agendamentos
-- Permitir que qualquer usuário veja a lista de profissionais para agendamentos

-- Remover política restritiva atual para profissionais
DROP POLICY IF EXISTS "Only admins can view professional data" ON public.professionals;

-- Criar política que permite visualização pública dos profissionais básicos
CREATE POLICY "Public can view professionals for appointments" 
ON public.professionals 
FOR SELECT 
USING (true);

-- Manter política administrativa para operações de gerenciamento
CREATE POLICY "Admins can manage professionals" 
ON public.professionals 
FOR ALL 
USING (is_active_admin())
WITH CHECK (is_active_admin());

-- Garantir que existe uma view pública para profissionais (se não existir)
CREATE OR REPLACE VIEW public.professionals_public AS
SELECT 
  id,
  name,
  created_at
FROM public.professionals;