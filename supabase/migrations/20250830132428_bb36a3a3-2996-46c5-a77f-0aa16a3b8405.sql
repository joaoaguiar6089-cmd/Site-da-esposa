-- Security Fix: Remove overly permissive RLS policies for clients table
-- This fixes the critical security vulnerability where client data was publicly accessible

-- Drop all current overly permissive policies
DROP POLICY IF EXISTS "Allow public CPF lookup for appointments" ON public.clients;
DROP POLICY IF EXISTS "Anyone can view clients with valid CPF" ON public.clients;
DROP POLICY IF EXISTS "Anyone can create clients with valid CPF" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can create clients" ON public.clients;

-- Create secure policies that protect client data
-- Only allow admins to view all client data
CREATE POLICY "Admins can view all clients" 
ON public.clients 
FOR SELECT 
USING (is_active_admin());

-- Allow clients to view only their own data by CPF
CREATE POLICY "Clients can view their own data" 
ON public.clients 
FOR SELECT 
USING (cpf = get_current_user_cpf());

-- Allow secure client creation only during appointment booking process
-- This allows creating clients when they book appointments but requires proper validation
CREATE POLICY "Allow client creation for appointments" 
ON public.clients 
FOR INSERT 
WITH CHECK (
  -- CPF must be valid format (11 digits)
  length(regexp_replace(cpf, '[^0-9]', '', 'g')) = 11 
  AND validate_cpf(cpf)
  -- Ensure all required fields are provided
  AND nome IS NOT NULL 
  AND sobrenome IS NOT NULL 
  AND celular IS NOT NULL
);

-- Allow admins to manage all client data
CREATE POLICY "Admins can manage all clients" 
ON public.clients 
FOR ALL 
USING (is_active_admin())
WITH CHECK (is_active_admin());

-- Add function to safely check if CPF exists without exposing data
CREATE OR REPLACE FUNCTION public.safe_check_cpf_exists(cpf_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Validate CPF format first
  IF cpf_param IS NULL OR length(regexp_replace(cpf_param, '[^0-9]', '', 'g')) != 11 THEN
    RETURN false;
  END IF;
  
  -- Clean CPF (remove non-numeric characters)
  cpf_param := regexp_replace(cpf_param, '[^0-9]', '', 'g');
  
  -- Log the attempt for security monitoring
  INSERT INTO public.security_audit_log (user_id, event_type, event_details, created_at)
  VALUES (auth.uid(), 'cpf_lookup_attempt', 
         jsonb_build_object('cpf_masked', left(cpf_param, 3) || '***' || right(cpf_param, 2)), 
         now());
  
  -- Return if CPF exists without exposing the actual data
  RETURN EXISTS (
    SELECT 1 FROM public.clients 
    WHERE cpf = cpf_param
  );
END;
$$;