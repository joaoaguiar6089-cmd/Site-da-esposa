-- Política mais permissiva para consulta de agendamentos por cliente
-- Permite consulta quando o client_id corresponde a um cliente válido
DROP POLICY IF EXISTS "Clients can view their own appointments" ON public.appointments;

CREATE POLICY "Allow viewing appointments by client_id" 
ON public.appointments 
FOR SELECT 
USING (
  client_id IN (SELECT id FROM public.clients)
  OR is_active_admin()
);