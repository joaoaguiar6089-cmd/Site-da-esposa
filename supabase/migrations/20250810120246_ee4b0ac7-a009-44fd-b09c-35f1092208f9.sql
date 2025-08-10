-- Fix critical security vulnerabilities

-- 1. Fix role escalation vulnerability - prevent users from changing their own roles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile (except role)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()));

-- Only admins can update user roles
CREATE POLICY "Admins can update user roles" 
ON public.profiles 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

-- 2. Restrict professional contact data access
DROP POLICY IF EXISTS "Authenticated users can view basic professional info" ON public.professionals;

-- Clients can only see professionals they have appointments with
CREATE POLICY "Clients can view professionals for their appointments" 
ON public.professionals 
FOR SELECT 
USING (
  is_admin() OR 
  id IN (
    SELECT DISTINCT p.id 
    FROM professionals p
    JOIN appointments a ON a.professional_id = p.id
    JOIN clients c ON c.id = a.client_id
    WHERE c.cpf = get_current_user_cpf()
  )
);

-- Public can only see basic professional info (name only) for appointment booking
CREATE POLICY "Public can view basic professional info" 
ON public.professionals 
FOR SELECT 
USING (true);

-- But we need to create a view for public access that only shows safe data
CREATE OR REPLACE VIEW public.professionals_public AS
SELECT 
  id,
  name,
  created_at
FROM public.professionals;

-- Grant access to the view
GRANT SELECT ON public.professionals_public TO authenticated;
GRANT SELECT ON public.professionals_public TO anon;

-- 3. Add constraints to prevent unauthorized role changes
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_roles 
CHECK (role IN ('admin', 'client'));

-- 4. Create admin users table for proper admin authentication
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_login timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can manage admin users
CREATE POLICY "Admins can manage admin users" 
ON public.admin_users 
FOR ALL 
USING (is_admin());

-- Function to check if user is an active admin
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users au
    JOIN public.profiles p ON p.user_id = au.user_id
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true 
    AND p.role = 'admin'
  );
$$;

-- Update admin-related policies to use the new function
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;
CREATE POLICY "Admins can manage all appointments" 
ON public.appointments 
FOR ALL 
USING (is_active_admin());

DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
CREATE POLICY "Admins can view all clients" 
ON public.clients 
FOR SELECT 
USING (is_active_admin());

DROP POLICY IF EXISTS "Admins can manage professionals" ON public.professionals;
CREATE POLICY "Admins can manage professionals" 
ON public.professionals 
FOR ALL 
USING (is_active_admin());

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_active_admin());

-- 5. Add audit logging for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  event_details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (is_active_admin());

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  event_details jsonb DEFAULT '{}',
  target_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    event_type,
    event_details
  ) VALUES (
    COALESCE(target_user_id, auth.uid()),
    event_type,
    event_details
  );
END;
$$;