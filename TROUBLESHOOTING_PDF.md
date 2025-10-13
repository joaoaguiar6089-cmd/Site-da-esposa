# 🔧 GUIA DE TROUBLESHOOTING - Upload de PDF

## ❌ Erro: "Could not find the 'pdf_template_path' column"

### Causa
A coluna `pdf_template_path` não existe na tabela `form_templates`.

### Solução
Execute a migration **20251013000002_add_pdf_template_path.sql** no Supabase Dashboard:

```sql
ALTER TABLE public.form_templates 
ADD COLUMN IF NOT EXISTS pdf_template_path TEXT;
```

---

## ❌ Erro: "The API version does not match the Worker version"

### Causa
Incompatibilidade entre a versão do `react-pdf` e o arquivo `pdf.worker.min.js`.

### Solução
✅ **JÁ CORRIGIDO!** O sistema agora usa automaticamente o worker correto:
```typescript
pdfjs.GlobalWorkerOptions.workerSrc = 
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

**Não é mais necessário** ter o `pdf.worker.min.js` na pasta `public/`.

---

## ❌ Erro: "Failed to load PDF"

### Causa
O erro acontece porque:
1. O bucket `form-pdfs` pode não existir no Supabase
2. As policies de acesso podem estar incorretas
3. URL do PDF pode estar incorreta

### Solução

#### 1. Executar Migrations Necessárias

**No Supabase Dashboard → SQL Editor:**

**Migration 1 - Criar Bucket:**
```sql
-- Cole e execute o conteúdo de:
-- supabase/migrations/20251013000001_create_form_pdfs_bucket.sql

-- Criar bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-pdfs', 'form-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Policies (admin pode fazer tudo, público pode ler)
CREATE POLICY "Admins can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'form-pdfs' AND
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Public can view PDFs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'form-pdfs');

-- Outras policies...
```

**Migration 2 - Adicionar Coluna pdf_template_path:**
```sql
-- Cole e execute o conteúdo de:
-- supabase/migrations/20251013000002_add_pdf_template_path.sql

ALTER TABLE public.form_templates 
ADD COLUMN IF NOT EXISTS pdf_template_path TEXT;

COMMENT ON COLUMN public.form_templates.pdf_template_path IS 
'Path do arquivo PDF no Storage (ex: form-templates/uuid/filename.pdf)';
```

**Após executar, verifique:**
- Bucket `form-pdfs` aparece em **Storage**
- Coluna `pdf_template_path` existe na tabela `form_templates`

#### 2. Verificar se Bucket Existe

**No Supabase Dashboard:**
1. Vá para **Storage**
2. Procure pelo bucket `form-pdfs`
3. Se não existir, execute a migration acima

#### 3. Testar Upload

**No localhost:**
1. Admin → Fichas Personalizadas → Editar ficha
2. Role até o final do painel esquerdo
3. Clique em **"Upload PDF"**
4. Selecione um PDF pequeno (anamnese, consentimento)
5. Aguarde mensagem de sucesso

**Se der erro:**
- Abra o Console do navegador (F12)
- Procure por erros no Network tab
- Copie a mensagem de erro completa

#### 4. Verificar URL Gerada

**Após upload bem-sucedido:**
1. O sistema salva `pdf_template_url` no banco
2. Ao clicar "Configurar Campos":
   - Sistema gera URL assinada (válida por 1 hora)
   - Usa essa URL para carregar no react-pdf
3. Se falhar, verifica se:
   - Bucket está público
   - Arquivo existe no path correto

## 🔍 Debug do Problema

### Console do Navegador

Procure por mensagens assim:

```
Erro ao gerar URL assinada: {...}
Erro ao carregar PDF: {...}
```

### Checklist de Verificação

- [ ] Migration do bucket executada no Supabase?
- [ ] Bucket `form-pdfs` aparece no Storage?
- [ ] Upload do PDF mostra mensagem de sucesso?
- [ ] Console do navegador mostra algum erro?
- [ ] Arquivo aparece no Storage do Supabase?

## 🛠️ Correções Implementadas

### 1. URL Assinada para CORS
**Mudança:** Sistema agora gera URL assinada válida por 1 hora
**Arquivo:** `PDFFieldMapper.tsx`
**Benefício:** Resolve problemas de CORS ao carregar PDF

### 2. Salvando Path do Arquivo
**Mudança:** Além da URL pública, salvamos o path do arquivo
**Arquivo:** `PDFTemplateUploader.tsx`
**Campo:** `pdf_template_path` (novo)
**Benefício:** Permite gerar URLs assinadas mesmo depois

### 3. Fallback para URL Original
**Mudança:** Se falhar ao gerar URL assinada, usa URL pública
**Arquivo:** `PDFFieldMapper.tsx`
**Benefício:** Sistema não quebra se houver problema

### 4. Loading State
**Mudança:** Mostra loading enquanto gera URL assinada
**Arquivo:** `PDFFieldMapper.tsx`
**Benefício:** UX melhor durante carregamento

## 📝 Próximos Passos

### Se Ainda Não Funcionar

1. **Verificar CORS do Bucket**
   - No Supabase Dashboard → Storage → form-pdfs
   - Verificar se CORS está habilitado

2. **Testar URL Manualmente**
   - Copiar URL do PDF do banco de dados
   - Tentar abrir em nova aba do navegador
   - Se não abrir, problema está no Storage

3. **Recrear Bucket**
   - Deletar bucket `form-pdfs`
   - Executar migration novamente
   - Testar upload novo

4. **Verificar Permissões do Admin**
   - Confirmar que user está em `admin_users`
   - Verificar que `is_active = true`
   - Testar com outro admin

## 🆘 Ainda com Problemas?

Envie as seguintes informações:

1. Mensagem de erro COMPLETA do console
2. Screenshot da aba Network do DevTools
3. Confirmar se bucket existe no Storage
4. Confirmar se migration foi executada
5. Confirmar se arquivo aparece no Storage após upload

---

**Resumo:** O sistema agora usa URLs assinadas que resolvem problemas de CORS. Execute a migration do bucket e teste novamente!
