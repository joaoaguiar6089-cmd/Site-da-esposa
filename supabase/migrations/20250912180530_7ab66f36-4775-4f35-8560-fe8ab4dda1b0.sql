-- Adicionar campos para seleção de área corporal na tabela procedures
ALTER TABLE public.procedures 
ADD COLUMN requires_body_selection boolean DEFAULT false,
ADD COLUMN body_selection_type text CHECK (body_selection_type IN ('face_male', 'face_female', 'body_male', 'body_female', 'custom')),
ADD COLUMN body_image_url text;

-- Criar tabela para áreas selecionáveis do corpo
CREATE TABLE public.body_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id uuid NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  coordinates jsonb NOT NULL, -- {x, y, width, height} em percentual
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar tabela para registrar as seleções de área nos agendamentos
CREATE TABLE public.appointment_body_selections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  body_area_id uuid NOT NULL REFERENCES public.body_areas(id) ON DELETE CASCADE,
  area_name text NOT NULL,
  area_price numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Adicionar campo para armazenar o sexo selecionado no agendamento
ALTER TABLE public.appointments 
ADD COLUMN selected_gender text CHECK (selected_gender IN ('male', 'female')),
ADD COLUMN total_body_areas_price numeric DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.body_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_body_selections ENABLE ROW LEVEL SECURITY;

-- Policies for body_areas
CREATE POLICY "Anyone can view body areas" 
ON public.body_areas 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage body areas" 
ON public.body_areas 
FOR ALL 
USING (is_active_admin());

-- Policies for appointment_body_selections
CREATE POLICY "Admins can manage appointment body selections" 
ON public.appointment_body_selections 
FOR ALL 
USING (is_active_admin());

CREATE POLICY "Clients can view their appointment body selections" 
ON public.appointment_body_selections 
FOR SELECT 
USING (appointment_id IN (
  SELECT a.id 
  FROM appointments a 
  JOIN clients c ON a.client_id = c.id 
  WHERE c.cpf = get_current_user_cpf()
));

CREATE POLICY "Allow body selection creation" 
ON public.appointment_body_selections 
FOR INSERT 
WITH CHECK (appointment_id IN (
  SELECT id FROM appointments
));

-- Create triggers for updated_at
CREATE TRIGGER update_body_areas_updated_at
BEFORE UPDATE ON public.body_areas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_body_areas_procedure_id ON public.body_areas(procedure_id);
CREATE INDEX idx_appointment_body_selections_appointment_id ON public.appointment_body_selections(appointment_id);
CREATE INDEX idx_appointment_body_selections_area_id ON public.appointment_body_selections(body_area_id);