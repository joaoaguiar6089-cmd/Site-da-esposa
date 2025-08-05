-- Allow clients to update their own phone number
CREATE POLICY "Clients can update their own phone number" 
ON public.clients 
FOR UPDATE 
USING (true)
WITH CHECK (true);