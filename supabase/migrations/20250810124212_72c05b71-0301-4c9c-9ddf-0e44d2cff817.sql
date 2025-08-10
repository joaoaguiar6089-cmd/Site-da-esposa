-- Corrigir política de INSERT para appointments permitir criação sem autenticação quando há um client_id válido
DROP POLICY "Authenticated users can create appointments" ON public.appointments;

CREATE POLICY "Allow appointment creation with valid client" 
ON public.appointments 
FOR INSERT 
WITH CHECK (
  client_id IN (SELECT id FROM public.clients)
);