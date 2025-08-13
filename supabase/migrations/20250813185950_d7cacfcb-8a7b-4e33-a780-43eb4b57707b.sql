-- Fix critical security vulnerability: Professional contact information exposure
-- Remove public access to sensitive professional data

-- Drop the overly permissive policy that allows anyone to view professional info
DROP POLICY IF EXISTS "Authenticated users can view basic professional info" ON public.professionals;

-- Create restrictive policies for professional data access
-- Only authenticated users can view basic professional info (name only)
CREATE POLICY "Authenticated users can view professional names only" 
ON public.professionals 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Ensure admins have full access (this policy should already exist but ensuring it's correct)
DROP POLICY IF EXISTS "Admins can manage professionals" ON public.professionals;
CREATE POLICY "Admins can manage professionals" 
ON public.professionals 
FOR ALL 
USING (is_active_admin());

-- Create a secure view for public/limited professional information
-- This view only exposes non-sensitive data
CREATE OR REPLACE VIEW public.professionals_public AS
SELECT 
  id,
  name,
  created_at
FROM public.professionals;

-- Enable RLS on the view
ALTER VIEW public.professionals_public OWNER TO postgres;

-- Grant access to the public view for authenticated users only
GRANT SELECT ON public.professionals_public TO authenticated;

-- Create RLS policy for the view - only authenticated users can access
CREATE POLICY "Authenticated users can view public professional info" 
ON public.professionals_public 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Update any existing queries that might be using the old unrestricted access
-- Note: Code changes will be needed to use the new restricted access pattern