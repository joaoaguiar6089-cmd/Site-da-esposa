-- =====================================================
-- Configuração do Bucket para Anexos do Estoque
-- =====================================================

-- 1. Criar o bucket (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  true,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[];

-- 2. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON storage.objects;

-- 3. Criar política para upload (usuários autenticados)
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

-- 4. Criar política para visualização (público)
CREATE POLICY "Public can view files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'client-documents');

-- 5. Criar política para atualização (usuários autenticados)
CREATE POLICY "Authenticated users can update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents')
WITH CHECK (bucket_id = 'client-documents');

-- 6. Criar política para exclusão (usuários autenticados)
CREATE POLICY "Authenticated users can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents');

-- 7. Verificar configuração
SELECT 
  'Bucket criado/atualizado com sucesso!' as status,
  id,
  name,
  public,
  file_size_limit,
  created_at
FROM storage.buckets 
WHERE name = 'client-documents';
