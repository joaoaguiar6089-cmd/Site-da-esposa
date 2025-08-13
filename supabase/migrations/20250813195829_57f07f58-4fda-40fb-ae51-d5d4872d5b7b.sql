-- Fix RLS policy for admin user creation
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR is_admin());

-- Add delete functionality for admin users
DROP POLICY IF EXISTS "Admins can delete admin users" ON public.admin_users;

CREATE POLICY "Admins can delete admin users" 
ON public.admin_users 
FOR DELETE 
USING (is_admin());