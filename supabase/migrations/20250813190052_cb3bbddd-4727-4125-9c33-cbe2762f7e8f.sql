-- Fix critical security vulnerability: Professional contact information exposure
-- Remove public access to sensitive professional data

-- Drop the overly permissive policy that allows anyone to view professional info
DROP POLICY IF EXISTS "Authenticated users can view basic professional info" ON public.professionals;

-- Create restrictive policies for professional data access
-- Only authenticated users can view professional data, but admins get full access
CREATE POLICY "Authenticated users can view professionals" 
ON public.professionals 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Ensure admins have full access for management
DROP POLICY IF EXISTS "Admins can manage professionals" ON public.professionals;
CREATE POLICY "Admins can manage professionals" 
ON public.professionals 
FOR ALL 
USING (is_active_admin());

-- Create a secure view for limited professional information (no sensitive data)
CREATE OR REPLACE VIEW public.professionals_public AS
SELECT 
  id,
  name,
  created_at
FROM public.professionals;

-- Grant access to the view for authenticated role
GRANT SELECT ON public.professionals_public TO authenticated;
GRANT SELECT ON public.professionals_public TO anon;