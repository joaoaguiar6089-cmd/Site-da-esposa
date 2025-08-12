-- Fix critical security vulnerability in profiles table
-- Remove dangerous "Admin debug access" policy that allows unrestricted public access

-- 1. Remove the insecure debug policy that allows unrestricted access to user profiles
DROP POLICY IF EXISTS "Admin debug access" ON public.profiles;

-- 2. Log the security fix
INSERT INTO public.security_audit_log (
  user_id, 
  event_type, 
  event_details, 
  created_at
) VALUES (
  NULL,
  'security_vulnerability_fixed',
  jsonb_build_object(
    'vulnerability', 'public_profiles_access',
    'action', 'removed_debug_policy',
    'table_affected', 'profiles',
    'policy_removed', 'Admin debug access'
  ),
  now()
);