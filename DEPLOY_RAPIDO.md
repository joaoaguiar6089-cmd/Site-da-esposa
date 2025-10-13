# 🚀 GUIA RÁPIDO DE DEPLOY - PDF System

## Passo a Passo para Produção

---

## 1️⃣ Executar Migration

**Supabase Dashboard → SQL Editor:**

```sql
-- Migration: Add filled_pdf_path to form_responses
ALTER TABLE public.form_responses 
ADD COLUMN IF NOT EXISTS filled_pdf_path TEXT;

COMMENT ON COLUMN public.form_responses.filled_pdf_path IS 
'Caminho do PDF preenchido no Storage (ex: filled-forms/client-id/response-id_timestamp.pdf)';

CREATE INDEX IF NOT EXISTS idx_form_responses_filled_pdf 
ON public.form_responses(filled_pdf_path) 
WHERE filled_pdf_path IS NOT NULL;
```

✅ **Executar** e verificar mensagem de sucesso

---

## 2️⃣ Deploy da Edge Function

### **Via Supabase CLI (Recomendado):**

```powershell
# 1. Instalar CLI (se ainda não tem)
npm install -g supabase

# 2. Login
supabase login

# 3. Ir para o diretório do projeto
cd c:\Users\joaoa\Documents\Site-da-esposa

# 4. Link ao projeto (primeira vez)
supabase link --project-ref SEU_PROJECT_REF

# 5. Deploy da função
supabase functions deploy generate-filled-pdf

# 6. Verificar
supabase functions list
```

### **Via Dashboard (Alternativa):**

1. Supabase Dashboard → Edge Functions
2. "New function" → Nome: `generate-filled-pdf`
3. Copiar código de `supabase/functions/generate-filled-pdf/index.ts`
4. Deploy

---

## 3️⃣ Verificar Variáveis de Ambiente

**Supabase Dashboard → Project Settings → Edge Functions:**

Verificar se existem:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

(Geralmente já configuradas automaticamente)

---

## 4️⃣ Testar a Funcionalidade

### **Passo 1: Configurar Template**

1. Admin → Fichas Personalizadas
2. Editar template existente (ou criar novo)
3. **Upload PDF:**
   - Clicar "Upload PDF"
   - Selecionar arquivo
   - Aguardar upload
4. **Configurar Campos:**
   - Clicar "Configurar Campos"
   - Selecionar campo da lista
   - Clicar no PDF para posicionar
   - Ajustar tamanho e fonte
   - Repetir para todos os campos
5. **Salvar Mapeamento**

### **Passo 2: Preencher Ficha**

1. Admin → Clientes → Selecionar cliente
2. Aba "Fichas"
3. Clicar "Preencher Ficha" em template com PDF
4. Preencher campos
5. "Enviar Ficha"

### **Passo 3: Gerar PDF**

1. Na aba "Fichas" do cliente
2. Histórico de Fichas → Clicar botão "PDF"
3. **Aguardar:**
   - Ícone bounce (loading)
   - Toast: "PDF gerado com sucesso"
   - PDF abre em nova aba
4. **Verificar:**
   - Campos estão preenchidos
   - Formatação correta (fonte, negrito)
   - Dados do cliente aparecem

---

## ✅ Checklist de Validação

- [ ] Migration executada sem erros
- [ ] Edge Function aparece na lista
- [ ] Template tem PDF configurado
- [ ] Campos mapeados no PDF
- [ ] Ficha preenchida pelo admin
- [ ] Botão "PDF" aparece no histórico
- [ ] Clicar gera PDF sem erros
- [ ] PDF abre em nova aba
- [ ] Campos estão preenchidos corretamente
- [ ] Toast de sucesso aparece
- [ ] PDF salvo no Storage (filled-forms/)

---

## 🐛 Erros Comuns

### **"Template não possui PDF configurado"**
→ Fazer upload do PDF no template

### **"Nenhum campo mapeado no PDF"**
→ Configurar Campos e salvar mapeamento

### **PDF abre mas campos vazios**
→ Verificar se dados estão na response_data

### **Erro 500**
→ Verificar logs da Edge Function no dashboard

---

## 📊 Verificar Logs

**Supabase Dashboard:**
1. Edge Functions → generate-filled-pdf
2. Aba "Logs"
3. Ver últimas execuções

**Procurar por:**
```
=== Generate Filled PDF Function ===
PDF gerado com sucesso
```

---

## 🎉 Pronto!

Sistema 100% funcional! 🚀

**Próximos passos opcionais:**
- Testar com diferentes tipos de campos
- Testar com PDFs de diferentes tamanhos
- Configurar mais templates
- Treinar equipe no uso

---

**Documentação completa:** Ver `EDGE_FUNCTION_PDF.md`
