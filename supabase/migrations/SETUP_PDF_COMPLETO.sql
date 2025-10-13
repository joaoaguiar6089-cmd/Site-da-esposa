-- ============================================
-- SETUP COMPLETO DO SISTEMA DE FICHAS COM PDF
-- Data: 2025-10-13
-- Execute este script no Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- 1. CRIAR BUCKET PARA PDFs
-- ============================================

-- Criar bucket (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-pdfs', 'form-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. ADICIONAR COLUNA pdf_template_path
-- ============================================

-- Adicionar coluna para armazenar path do arquivo
ALTER TABLE public.form_templates 
ADD COLUMN IF NOT EXISTS pdf_template_path TEXT;

-- Comentário explicativo
COMMENT ON COLUMN public.form_templates.pdf_template_path IS 
'Path do arquivo PDF no Supabase Storage (ex: form-templates/uuid/filename.pdf). Usado para gerar URLs assinadas.';

-- ============================================
-- 3. POLICIES DE ACESSO AO STORAGE
-- ============================================

-- Limpar policies antigas (se existirem)
DROP POLICY IF EXISTS "Admins can upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Public can view PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update PDFs" ON storage.objects;

-- Policy: Admins podem fazer UPLOAD
CREATE POLICY "Admins can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'form-pdfs' AND
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Policy: PÚBLICO pode VISUALIZAR (necessário para URLs assinadas)
CREATE POLICY "Public can view PDFs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'form-pdfs');

-- Policy: Admins podem DELETAR
CREATE POLICY "Admins can delete PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'form-pdfs' AND
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Policy: Admins podem ATUALIZAR
CREATE POLICY "Admins can update PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'form-pdfs' AND
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- ============================================
-- 4. VERIFICAÇÃO
-- ============================================

-- Verificar se bucket foi criado
SELECT id, name, public FROM storage.buckets WHERE id = 'form-pdfs';

-- Verificar se coluna foi adicionada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'form_templates' AND column_name = 'pdf_template_path';

-- Verificar policies
SELECT policyname, tablename, cmd 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
AND policyname LIKE '%PDF%';

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- ✅ Bucket 'form-pdfs' com public = true
-- ✅ Coluna 'pdf_template_path' tipo TEXT, nullable
-- ✅ 4 policies criadas (upload, view, delete, update)
