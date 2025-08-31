-- Add procedure_id to promotions table
ALTER TABLE public.promotions 
ADD COLUMN procedure_id UUID REFERENCES public.procedures(id) ON DELETE SET NULL;