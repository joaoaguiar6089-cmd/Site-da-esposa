-- Fix SECURITY DEFINER view security issue
-- Drop and recreate the professionals_public view without SECURITY DEFINER

-- Drop the existing view
DROP VIEW IF EXISTS public.professionals_public CASCADE;

-- Recreate the view with proper security (SECURITY INVOKER is the default)
CREATE VIEW public.professionals_public WITH (security_invoker=true) AS
SELECT 
  id,
  name,
  created_at
FROM public.professionals;

-- Grant select permissions to authenticated and anonymous users
GRANT SELECT ON public.professionals_public TO authenticated;
GRANT SELECT ON public.professionals_public TO anon;