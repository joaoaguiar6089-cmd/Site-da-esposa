-- Criar política para permitir consulta pública de clientes por CPF
-- Isso é necessário para o fluxo de agendamento onde buscamos clientes existentes
CREATE POLICY "Allow public CPF lookup for appointments" 
ON public.clients 
FOR SELECT 
USING (true);

-- Remover a política anterior que estava muito restritiva
DROP POLICY IF EXISTS "Clients can view their own data via CPF" ON public.clients;