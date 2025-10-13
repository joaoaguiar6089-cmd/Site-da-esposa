# 🔧 GUIA DE TROUBLESHOOTING - Upload de PDF

## ❌ Erro: "Failed to load PDF"

### Causa
O erro acontece porque:
1. O bucket `form-pdfs` pode não existir no Supabase
2. As policies de acesso podem estar incorretas
3. URL do PDF pode estar incorreta

### Solução

#### 1. Executar Migration do Bucket

**No Supabase Dashboard:**
1. Vá para **SQL Editor**
2. Cole o conteúdo do arquivo:
   ```
   supabase/migrations/20251013000001_create_form_pdfs_bucket.sql
   ```
3. Execute o SQL
4. Verifique se bucket foi criado em **Storage**

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
