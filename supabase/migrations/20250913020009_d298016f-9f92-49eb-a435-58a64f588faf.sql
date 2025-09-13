-- Adicionar coluna is_procedure na tabela promotions
ALTER TABLE public.promotions 
ADD COLUMN is_procedure BOOLEAN DEFAULT true;