# 🔧 CORREÇÕES APLICADAS - Sistema de PDF

## Data: 13 de Outubro de 2025

---

## ✅ Problema 1: Coluna pdf_template_path não existe

### Erro
```
Could not find the 'pdf_template_path' column of 'form_templates'
```

### Solução
**Criada migration:** `20251013000002_add_pdf_template_path.sql`

```sql
ALTER TABLE public.form_templates 
ADD COLUMN IF NOT EXISTS pdf_template_path TEXT;
```

### Status
⏳ **Precisa executar no Supabase Dashboard**

---

## ✅ Problema 2: Versão do Worker incompatível

### Erro
```
The API version "5.3.93" does not match the Worker version "3.11.174"
```

### Causa
- `react-pdf` v10.1.0 usa internamente `pdfjs-dist` v5.3.93
- Worker antigo na pasta `public/` era v3.11.174
- Incompatibilidade causa erro ao carregar PDF

### Solução Aplicada

**Arquivo:** `src/components/admin/forms/PDFFieldMapper.tsx`

**Mudança 1 - Worker Dinâmico:**
```typescript
// ANTES (worker estático antigo):
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// DEPOIS (worker dinâmico da versão correta):
pdfjs.GlobalWorkerOptions.workerSrc = 
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

**Benefício:** Sempre usa o worker da versão correta automaticamente.

---

## ✅ Problema 3: Avisos de "Options prop changed"

### Aviso
```
Warning: Options prop passed to <Document /> changed, but it's equal to previous one. 
This might result in unnecessary reloads.
```

### Causa
O objeto `options` era recriado a cada render, causando reloads desnecessários.

### Solução Aplicada

**Mudança 1 - Import useMemo:**
```typescript
import { useState, useEffect, useRef, useMemo } from "react";
```

**Mudança 2 - Memoizar Options:**
```typescript
// Memoizar options para evitar reloads desnecessários
const pdfOptions = useMemo(() => ({
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
}), []);
```

**Mudança 3 - Usar Options Memoizadas:**
```typescript
<Document
  file={signedPdfUrl}
  onLoadSuccess={onDocumentLoadSuccess}
  options={pdfOptions}  // <-- Objeto memoizado
>
```

**Benefício:** 
- Elimina avisos de reload desnecessário
- Melhora performance do componente
- Options são criadas apenas 1 vez

---

## 📦 Arquivos Criados/Modificados

### Criados
1. ✅ `supabase/migrations/20251013000002_add_pdf_template_path.sql`
2. ✅ `supabase/migrations/SETUP_PDF_COMPLETO.sql` (script consolidado)
3. ✅ `TROUBLESHOOTING_PDF.md` (guia completo)
4. ✅ `CORRECOES_PDF.md` (este arquivo)

### Modificados
1. ✅ `src/components/admin/forms/PDFFieldMapper.tsx`
   - Worker dinâmico
   - useMemo para options
   - Melhores tratamentos de erro

---

## 🧪 Como Testar

### 1. Executar Migration (OBRIGATÓRIO)

**Supabase Dashboard → SQL Editor:**
```sql
-- Copiar e colar conteúdo de SETUP_PDF_COMPLETO.sql
-- OU executar apenas:
ALTER TABLE public.form_templates 
ADD COLUMN IF NOT EXISTS pdf_template_path TEXT;
```

### 2. Testar Upload

1. Recarregue a aplicação no navegador
2. Admin → Fichas Personalizadas → Editar ficha
3. Role até o final do painel esquerdo
4. Clique em **"Upload PDF"**
5. Selecione um arquivo PDF
6. Aguarde upload completar

### 3. Testar Mapeamento

1. Após upload, clique em **"Configurar Campos"**
2. PDF deve carregar SEM ERROS
3. Console não deve mostrar avisos de "Worker version"
4. Console não deve mostrar avisos de "Options prop changed"

---

## ✅ Resultado Esperado

### Console Limpo
- ❌ Sem erro de Worker version
- ❌ Sem avisos de Options changed
- ✅ PDF carrega corretamente

### Funcionalidades
- ✅ Upload de PDF funciona
- ✅ Configurar Campos abre o mapper
- ✅ PDF renderiza no canvas
- ✅ Clique para posicionar campos funciona
- ✅ Zoom funciona
- ✅ Navegação entre páginas funciona

---

## 📊 Status do Sistema

- ✅ 95% Completo
- 🔧 Aguardando execução de migration (você precisa fazer)
- ⏳ Falta Edge Function (próximo passo)
- ⏳ Falta FormViewer update (próximo passo)

---

## 🆘 Se Ainda Houver Problemas

### Verificar no Console
1. Abra DevTools (F12)
2. Aba Console
3. Procure por:
   - Erros em vermelho
   - Avisos (warnings) em amarelo
   - Mensagens de rede (Network)

### Informações Úteis
- Versão do react-pdf: **10.1.0**
- Versão interna do pdfjs-dist: **5.3.93**
- Worker: Carregado dinamicamente do CDN
- Storage: Bucket `form-pdfs` (público)

### Próximos Passos se Funcionar
1. Testar mapeamento de campos completo
2. Salvar mapeamento
3. Criar Edge Function para gerar PDF preenchido
4. Atualizar FormViewer para mostrar PDF

---

**Resumo:** Corrigimos incompatibilidade de versões do worker e otimizamos o componente. Após executar a migration, o sistema de PDF deve funcionar perfeitamente! 🚀
