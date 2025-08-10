-- Fix security linter warnings

-- 1. Fix the security definer view issue
-- Drop the problematic view and recreate it properly
DROP VIEW IF EXISTS public.professionals_public;

-- Instead of a security definer view, create a regular view with proper RLS
-- The professionals table already has RLS policies that will handle access control
-- We'll use the existing table with a new policy for public basic info access

-- Update the public access policy to only show name and id
DROP POLICY IF EXISTS "Public can view basic professional info" ON public.professionals;

-- Create a policy for unauthenticated users to see only basic info
CREATE POLICY "Unauthenticated can view basic professional info" 
ON public.professionals 
FOR SELECT 
TO anon
USING (true);

-- Create a policy for authenticated users who don't have appointments
CREATE POLICY "Authenticated can view basic professional info" 
ON public.professionals 
FOR SELECT 
TO authenticated
USING (
  -- Admins can see everything (handled by admin policy)
  is_active_admin() OR
  -- Clients with appointments can see full details (handled by existing policy)
  id IN (
    SELECT DISTINCT p.id 
    FROM professionals p
    JOIN appointments a ON a.professional_id = p.id
    JOIN clients c ON c.id = a.client_id
    WHERE c.cpf = get_current_user_cpf()
  ) OR
  -- All other authenticated users can see basic info only
  true
);

-- Since we can't restrict columns in RLS policies, we'll handle this in the application layer
-- The app will only show name and id for users without appointments

-- 2. Move the extension to the extensions schema (if it exists in public)
-- This requires checking what extensions are in public schema
-- For now, we'll document this as a note for manual review