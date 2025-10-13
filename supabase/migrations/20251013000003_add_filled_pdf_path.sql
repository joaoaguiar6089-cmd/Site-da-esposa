-- Migration: Add filled_pdf_path to form_responses
-- Date: 2025-10-13
-- Description: Adiciona coluna para armazenar o caminho do PDF preenchido

-- Adicionar coluna filled_pdf_path
ALTER TABLE public.form_responses 
ADD COLUMN IF NOT EXISTS filled_pdf_path TEXT;

-- Comentário explicativo
COMMENT ON COLUMN public.form_responses.filled_pdf_path IS 
'Caminho do PDF preenchido no Supabase Storage (ex: filled-forms/client-id/response-id_timestamp.pdf)';

-- Índice para buscar PDFs preenchidos
CREATE INDEX IF NOT EXISTS idx_form_responses_filled_pdf 
ON public.form_responses(filled_pdf_path) 
WHERE filled_pdf_path IS NOT NULL;
