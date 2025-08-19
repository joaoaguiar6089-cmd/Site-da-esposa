-- Adicionar coluna de sessões à tabela procedures
ALTER TABLE public.procedures 
ADD COLUMN sessions INTEGER DEFAULT 1 NOT NULL;