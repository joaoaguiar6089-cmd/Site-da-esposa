-- Criar tabela para configuração de cidades
CREATE TABLE public.city_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir cidades padrão
INSERT INTO public.city_settings (city_name, display_order) VALUES 
('Tefé', 1),
('Manaus', 2);

-- Criar tabela para disponibilidade por cidade
CREATE TABLE public.city_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID NOT NULL REFERENCES public.city_settings(id) ON DELETE CASCADE,
  date_start DATE NOT NULL,
  date_end DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.city_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_availability ENABLE ROW LEVEL SECURITY;

-- Policies para city_settings
CREATE POLICY "Admins can manage city settings" 
ON public.city_settings 
FOR ALL 
USING (is_active_admin());

CREATE POLICY "Anyone can view active cities" 
ON public.city_settings 
FOR SELECT 
USING (is_active = true);

-- Policies para city_availability  
CREATE POLICY "Admins can manage city availability" 
ON public.city_availability 
FOR ALL 
USING (is_active_admin());

CREATE POLICY "Anyone can view city availability" 
ON public.city_availability 
FOR SELECT 
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_city_settings_updated_at
BEFORE UPDATE ON public.city_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_city_availability_updated_at
BEFORE UPDATE ON public.city_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar campo city_id na tabela appointments
ALTER TABLE public.appointments ADD COLUMN city_id UUID REFERENCES public.city_settings(id);