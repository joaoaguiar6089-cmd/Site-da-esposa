-- Adicionar coluna de indicação à tabela procedures
ALTER TABLE public.procedures 
ADD COLUMN indication TEXT;