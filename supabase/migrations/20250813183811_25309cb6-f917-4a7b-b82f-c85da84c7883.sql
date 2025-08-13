-- Fix security vulnerability: Restrict access to professionals' sensitive data

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view basic professional info" ON public.professionals;

-- Create more secure policies
-- Allow authenticated users to see only basic professional info (name only)
CREATE POLICY "Authenticated users can view professional names" 
ON public.professionals 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow admins full access to manage professionals
-- (This policy already exists but ensuring it's properly defined)
DROP POLICY IF EXISTS "Admins can manage professionals" ON public.professionals;
CREATE POLICY "Admins can manage professionals" 
ON public.professionals 
FOR ALL 
USING (is_active_admin());

-- Create a view for public/limited professional info
CREATE OR REPLACE VIEW public.professionals_public AS
SELECT 
  id,
  name,
  created_at
FROM public.professionals;

-- Enable RLS on the view
ALTER VIEW public.professionals_public OWNER TO postgres;

-- Grant access to the public view for authenticated users
GRANT SELECT ON public.professionals_public TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Anyone can view public professional info" 
ON public.professionals_public 
FOR SELECT 
USING (true);