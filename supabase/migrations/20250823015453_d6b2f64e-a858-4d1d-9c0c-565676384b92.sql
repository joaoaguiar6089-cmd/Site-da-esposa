-- Adicionar campo data_nascimento na tabela clients
ALTER TABLE public.clients 
ADD COLUMN data_nascimento DATE;

-- Criar tabela para armazenar fotos dos resultados dos procedimentos
CREATE TABLE public.procedure_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on procedure_results
ALTER TABLE public.procedure_results ENABLE ROW LEVEL SECURITY;

-- Create policies for procedure_results
CREATE POLICY "Admins can manage procedure results" 
ON public.procedure_results 
FOR ALL 
USING (is_active_admin());

CREATE POLICY "Clients can view their own procedure results" 
ON public.procedure_results 
FOR SELECT 
USING (
  appointment_id IN (
    SELECT a.id 
    FROM public.appointments a
    JOIN public.clients c ON a.client_id = c.id
    WHERE c.cpf = get_current_user_cpf()
  )
);

-- Create trigger for automatic timestamp updates on procedure_results
CREATE TRIGGER update_procedure_results_updated_at
BEFORE UPDATE ON public.procedure_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for procedure result images if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('procedure-results', 'procedure-results', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for procedure result images
CREATE POLICY "Admins can upload procedure result images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'procedure-results' AND is_active_admin());

CREATE POLICY "Admins can view procedure result images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'procedure-results' AND is_active_admin());

CREATE POLICY "Clients can view their own procedure result images" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'procedure-results' AND 
  name LIKE (get_current_user_cpf() || '/%')
);