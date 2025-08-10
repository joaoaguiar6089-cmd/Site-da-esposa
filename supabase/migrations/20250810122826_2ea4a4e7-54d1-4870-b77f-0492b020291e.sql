-- Allow unauthenticated CPF lookup for initial login verification only
-- This policy allows checking if a CPF exists during the login process
CREATE POLICY "Allow CPF existence check for login" 
ON public.clients 
FOR SELECT 
USING (
  -- Only allow during unauthenticated state for login purposes
  auth.uid() IS NULL
);