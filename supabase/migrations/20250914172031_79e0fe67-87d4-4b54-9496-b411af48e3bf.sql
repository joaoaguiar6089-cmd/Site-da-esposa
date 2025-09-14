-- Add requires_specifications field to procedures table
ALTER TABLE public.procedures 
ADD COLUMN IF NOT EXISTS requires_specifications boolean DEFAULT false;

-- Create procedure_specifications table if not exists
CREATE TABLE IF NOT EXISTS public.procedure_specifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create appointment_specifications table if not exists
CREATE TABLE IF NOT EXISTS public.appointment_specifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  specification_id UUID NOT NULL REFERENCES public.procedure_specifications(id) ON DELETE CASCADE,
  specification_name TEXT NOT NULL,
  specification_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.procedure_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_specifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for procedure_specifications
CREATE POLICY "Anyone can view active specifications" ON public.procedure_specifications
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage specifications" ON public.procedure_specifications
  FOR ALL USING (is_active_admin());

-- RLS Policies for appointment_specifications  
CREATE POLICY "Clients can view their appointment specifications" ON public.appointment_specifications
  FOR SELECT USING (
    appointment_id IN (
      SELECT a.id FROM appointments a 
      JOIN clients c ON a.client_id = c.id
      WHERE c.cpf = get_current_user_cpf()
    )
  );

CREATE POLICY "Allow specification creation for appointments" ON public.appointment_specifications
  FOR INSERT WITH CHECK (
    appointment_id IN (SELECT id FROM appointments)
  );

CREATE POLICY "Admins can manage appointment specifications" ON public.appointment_specifications
  FOR ALL USING (is_active_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_procedure_specifications_updated_at
  BEFORE UPDATE ON public.procedure_specifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();