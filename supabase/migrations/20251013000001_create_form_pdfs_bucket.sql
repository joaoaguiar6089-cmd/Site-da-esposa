-- =====================================================
-- CRIAR BUCKET PARA PDFs DE FORMULÁRIOS
-- =====================================================
-- Execute este SQL no Supabase Dashboard → SQL Editor

-- 1. Criar bucket público para PDFs de templates e preenchidos
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-pdfs', 'form-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: Admins podem fazer upload de PDFs de templates
CREATE POLICY "Admins can upload form PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'form-pdfs' AND
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.is_active = true
  )
);

-- 3. Policy: Todos podem ler PDFs (necessário para preview)
CREATE POLICY "Anyone can read form PDFs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'form-pdfs');

-- 4. Policy: Admins podem deletar PDFs
CREATE POLICY "Admins can delete form PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'form-pdfs' AND
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.is_active = true
  )
);

-- 5. Policy: Admins podem atualizar PDFs
CREATE POLICY "Admins can update form PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'form-pdfs' AND
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.is_active = true
  )
);

-- ✅ Pronto! Agora o bucket 'form-pdfs' está configurado e pronto para uso
