-- Fix security vulnerability: Restrict professional data access to admins only
-- Remove authenticated user access to sensitive professional information

-- Drop the current policy that allows all authenticated users to view professionals
DROP POLICY IF EXISTS "Authenticated users can view professionals" ON public.professionals;

-- Create admin-only access policy for viewing professional data
CREATE POLICY "Only admins can view professional data" 
ON public.professionals 
FOR SELECT 
USING (is_active_admin());

-- Ensure the admin management policy is correctly set
DROP POLICY IF EXISTS "Admins can manage professionals" ON public.professionals;
CREATE POLICY "Admins can manage professionals" 
ON public.professionals 
FOR ALL 
USING (is_active_admin());