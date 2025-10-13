-- Migration: Add pdf_template_path column to form_templates
-- Date: 2025-10-13
-- Description: Adiciona coluna para armazenar o path do arquivo PDF no Storage,
--              necessário para gerar URLs assinadas e evitar problemas de CORS

-- Adicionar coluna pdf_template_path
ALTER TABLE public.form_templates 
ADD COLUMN IF NOT EXISTS pdf_template_path TEXT;

-- Comentário explicativo
COMMENT ON COLUMN public.form_templates.pdf_template_path IS 'Path do arquivo PDF no Supabase Storage (ex: form-templates/uuid/filename.pdf). Usado para gerar URLs assinadas.';

-- Atualizar registros existentes que já têm pdf_template_url
-- Tentar extrair o path da URL pública existente
UPDATE public.form_templates
SET pdf_template_path = 
  CASE 
    WHEN pdf_template_url IS NOT NULL 
    THEN regexp_replace(
      pdf_template_url, 
      '^.*/storage/v1/object/public/form-pdfs/', 
      ''
    )
    ELSE NULL
  END
WHERE pdf_template_url IS NOT NULL AND pdf_template_path IS NULL;
