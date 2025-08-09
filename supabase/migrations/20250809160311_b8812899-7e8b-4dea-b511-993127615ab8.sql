-- Create user profiles table for authentication
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'client',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_current_user_role() = 'admin';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create function to get current user's CPF
CREATE OR REPLACE FUNCTION public.get_current_user_cpf()
RETURNS TEXT AS $$
  SELECT cpf FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_admin());

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Clients can view their own data" ON public.clients;
DROP POLICY IF EXISTS "Anyone can create clients" ON public.clients;
DROP POLICY IF EXISTS "Clients can update their own phone number" ON public.clients;

-- Create secure policies for clients table
CREATE POLICY "Admins can view all clients" 
ON public.clients 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Authenticated users can create clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clients can view their own data via CPF" 
ON public.clients 
FOR SELECT 
USING (
  cpf = get_current_user_cpf() OR is_admin()
);

CREATE POLICY "Clients can update their own data" 
ON public.clients 
FOR UPDATE 
USING (
  cpf = get_current_user_cpf() OR is_admin()
);

-- Drop existing insecure policies for appointments
DROP POLICY IF EXISTS "Anyone can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admin can delete appointments" ON public.appointments;

-- Create secure policies for appointments table
CREATE POLICY "Admins can manage all appointments" 
ON public.appointments 
FOR ALL 
USING (is_admin());

CREATE POLICY "Clients can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE cpf = get_current_user_cpf()
  ) OR is_admin()
);

CREATE POLICY "Authenticated users can create appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clients can update their own appointments" 
ON public.appointments 
FOR UPDATE 
USING (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE cpf = get_current_user_cpf()
  ) OR is_admin()
);

-- Drop existing insecure policies for professionals
DROP POLICY IF EXISTS "Anyone can view professionals" ON public.professionals;
DROP POLICY IF EXISTS "Admins can manage professionals" ON public.professionals;

-- Create secure policies for professionals table
CREATE POLICY "Admins can manage professionals" 
ON public.professionals 
FOR ALL 
USING (is_admin());

CREATE POLICY "Authenticated users can view basic professional info" 
ON public.professionals 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Add trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();