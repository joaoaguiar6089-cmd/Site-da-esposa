-- Allow unauthenticated users to view clients by CPF for login purposes
CREATE POLICY "Allow public CPF lookup for login" 
ON public.clients 
FOR SELECT 
USING (true);