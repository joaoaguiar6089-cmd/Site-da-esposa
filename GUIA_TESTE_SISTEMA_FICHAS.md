# 🚀 Guia de Teste - Sistema de Fichas V3.0

## Data: 13/10/2025

## ✅ Integração Concluída

O sistema de fichas foi **100% integrado** na aplicação!

### 📍 Localização

**Área do Cliente** → Aba **"Fichas"**

```
Caminho: /area-cliente
Aba: "Fichas" (terceira aba)
Componente: ClientFormsArea
```

---

## 🧪 Roteiro de Testes

### **Teste 1: Criar Nova Ficha**

**Passos:**
1. Acesse Área do Cliente
2. Faça login com celular de um cliente
3. Clique na aba **"Fichas"**
4. Clique no botão **"Nova Ficha"** (topo direito)
5. Dialog abre com lista de templates
6. Use a busca para filtrar (opcional)
7. Clique em um template (ex: "Laser")
8. FormFillerDialog abre com campos vazios
9. Preencha os campos obrigatórios
10. Clique **"Visualizar Ficha"**

**Resultado Esperado:**
- ✅ Preview abre com 2 tabs: "Visualizar PDF" e "Dados Preenchidos"
- ✅ Tab PDF mostra documento com dados preenchidos
- ✅ Controles de zoom funcionam (- / +)
- ✅ Tab Dados mostra lista formatada dos campos
- ✅ Botões disponíveis: Editar, Duplicar, Baixar PDF, Fechar

---

### **Teste 2: Visualizar PDF no Painel**

**Passos:**
1. Após criar ficha (Teste 1)
2. Certifique-se que está na tab **"Visualizar PDF"**
3. Aguarde carregamento do PDF
4. Use botões **-** e **+** para zoom
5. Se PDF tiver várias páginas, use "Anterior"/"Próxima"

**Resultado Esperado:**
- ✅ PDF renderiza com dados preenchidos
- ✅ Zoom funciona (50% a 200%)
- ✅ Navegação de páginas funciona
- ✅ Não precisa baixar para ver

**Se PDF não aparecer:**
- Verifique se o template tem `pdf_template_url` configurado
- Verifique se Edge Function `generate-filled-pdf` está deployada
- Veja console do navegador para erros

---

### **Teste 3: Editar Ficha Existente**

**Passos:**
1. Na aba "Fichas", veja lista de fichas criadas
2. Clique no botão **✏️ Editar** em qualquer card
3. FormFillerDialog abre com **dados já preenchidos**
4. Altere alguns campos (ex: mudar nome de "João" para "João Silva")
5. Clique **"Visualizar Ficha"**
6. Verifique preview com dados atualizados

**Resultado Esperado:**
- ✅ Formulário carrega com dados existentes
- ✅ Campos editáveis normalmente
- ✅ Ao salvar, dados são atualizados
- ✅ Timestamp "Atualizada em" muda
- ✅ Preview mostra dados novos

**OU diretamente do Preview:**
1. Abra qualquer ficha (botão "Visualizar")
2. Clique botão **"Editar"** (topo direito do preview)
3. Edite campos
4. Clique "Visualizar Ficha"

---

### **Teste 4: Duplicar Ficha**

**Passos:**
1. Abra uma ficha existente (botão "Visualizar")
2. Clique botão **"Duplicar"** (topo direito do preview)
3. Aguarde toast: "Ficha duplicada"
4. FormFillerDialog abre automaticamente com **mesmos dados**
5. Altere alguns campos (ex: só mudar endereço)
6. Clique "Visualizar Ficha"
7. Volte para lista de fichas

**Resultado Esperado:**
- ✅ Nova ficha criada com status "Rascunho"
- ✅ Dados copiados da ficha original
- ✅ Ficha original permanece inalterada
- ✅ Agora existem 2 fichas separadas no histórico
- ✅ Nova ficha permite edição

**Use Case:**
"Cliente tem ficha de 2023. Em 2024, só mudou telefone. Duplica, altera telefone, salva. Histórico mantém as 2 versões."

---

### **Teste 5: Buscar Templates**

**Passos:**
1. Clique "Nova Ficha"
2. No dialog, use campo de busca
3. Digite "laser" → filtra templates com "laser" no nome
4. Digite "avaliação" → filtra templates da categoria
5. Limpe busca → mostra todos novamente

**Resultado Esperado:**
- ✅ Busca funciona em tempo real
- ✅ Filtra por: nome, descrição, categoria
- ✅ Case-insensitive
- ✅ Agrupamento por categoria mantido

---

### **Teste 6: Status das Fichas**

**Passos:**
1. Crie nova ficha mas clique "Salvar Rascunho"
2. Veja card na lista → Badge **"Rascunho"** (🟡 amarelo)
3. Abra e clique "Visualizar Ficha" → Badge **"Enviada"** (🟢 verde)
4. (Futuro) Admin pode marcar como "Revisada" → Badge **"Revisada"** (🔵 azul)

**Resultado Esperado:**
- ✅ Rascunho: amarelo, ícone Clock
- ✅ Enviada: verde, ícone CheckCircle2
- ✅ Revisada: azul, ícone FileCheck
- ✅ Arquivada: cinza, ícone AlertCircle

---

### **Teste 7: Baixar PDF**

**Passos:**
1. Abra preview de qualquer ficha
2. Clique botão **"Baixar PDF"**
3. PDF abre em nova aba
4. Verifique dados preenchidos no PDF
5. Salve/imprima conforme necessário

**Resultado Esperado:**
- ✅ PDF abre em nova aba
- ✅ Todos os campos mapeados aparecem preenchidos
- ✅ Toast confirma: "PDF gerado com sucesso"
- ✅ URL é assinada (válida por 24h)

---

### **Teste 8: Empty States**

**Teste 8.1: Cliente Sem Fichas**
1. Acesse cliente que nunca preencheu fichas
2. Vá para aba "Fichas"

**Resultado Esperado:**
- ✅ Mostra card com mensagem: "Nenhuma ficha encontrada"
- ✅ Botão: "Criar Primeira Ficha"
- ✅ Ícone de documento

**Teste 8.2: Nenhum Template Disponível**
1. Desative todos os templates ou marque is_published=false
2. Clique "Nova Ficha"

**Resultado Esperado:**
- ✅ Mensagem: "Nenhum template disponível"
- ✅ Instrução: "Configure templates na seção de Fichas Personalizadas"
- ✅ Botão "Voltar"

---

## 🎨 Checklist Visual

### **Grid de Cards**
- [ ] Cards mostram nome do template
- [ ] Badge de status colorido
- [ ] Data de criação formatada (dd/MM/yyyy às HH:mm)
- [ ] Data de envio (se aplicável)
- [ ] Botões: "Visualizar" e "✏️"
- [ ] Responsivo: 1 coluna (mobile), 2 (tablet), 3 (desktop)

### **Preview do PDF**
- [ ] Tab "Visualizar PDF" disponível (se template tiver PDF)
- [ ] PDF renderiza centralizados
- [ ] Controles de zoom funcionam
- [ ] Navegação de páginas (se aplicável)
- [ ] Loading state enquanto gera
- [ ] Fallback se não tiver PDF configurado

### **Preview dos Dados**
- [ ] Tab "Dados Preenchidos" sempre disponível
- [ ] Campos listados com labels
- [ ] Asterisco (*) em campos obrigatórios
- [ ] Valores formatados (datas, booleanos, etc.)
- [ ] "Não preenchido" em itálico cinza para campos vazios
- [ ] Separadores entre campos

### **Dialogs**
- [ ] Seletor de Template: busca funciona
- [ ] Seletor de Template: agrupamento por categoria
- [ ] Formulário: campos dinâmicos conforme template
- [ ] Formulário: validação funciona
- [ ] Formulário: progress bar atualiza
- [ ] Preview: botões de ação visíveis

---

## 🐛 Troubleshooting

### **Problema: PDF não gera**

**Possíveis Causas:**
1. Edge Function não deployada
2. Template sem `pdf_template_url`
3. Erro no mapeamento de campos

**Solução:**
```bash
# Verificar deploy
supabase functions list

# Re-deploy se necessário
supabase functions deploy generate-filled-pdf

# Verificar logs
supabase functions logs generate-filled-pdf
```

### **Problema: Templates não aparecem**

**Verificar:**
1. Banco: `form_templates` tem registros?
2. `is_published = true`?
3. `is_active = true`?
4. RLS policies permitem leitura?

**SQL Debug:**
```sql
SELECT * FROM form_templates 
WHERE is_published = true 
AND is_active = true;
```

### **Problema: Campos não salvam**

**Verificar:**
1. Console do navegador (erros JS)
2. Network tab (erro 500? 401?)
3. `template_version` está sendo passado?
4. `client_id` está correto?

**Console Log:**
```
=== DEBUG SAVE ===
Form Data: { nome: "João", data: "1999-04-07" }
Template Version: 1
Client ID: uuid-do-cliente
Submit: true
```

### **Problema: Duplicação não funciona**

**Verificar:**
1. RLS policy permite INSERT em `form_responses`?
2. `response_data` é válido JSON?
3. Callback `onDuplicate` está conectado?

---

## 📊 Dados de Teste

### **Criar Template de Teste**

```sql
-- Inserir template simples
INSERT INTO form_templates (
  name, 
  description, 
  category, 
  is_published, 
  is_active,
  version
) VALUES (
  'Ficha de Teste',
  'Template para testar o sistema',
  'Teste',
  true,
  true,
  1
);

-- Inserir campos
INSERT INTO form_fields (
  template_id,
  field_key,
  label,
  field_type,
  is_required,
  order_index
) VALUES
  (
    '-- id do template criado acima --',
    'nome',
    'Nome Completo',
    'text',
    true,
    1
  ),
  (
    '-- id do template criado acima --',
    'data_nascimento',
    'Data de Nascimento',
    'date',
    true,
    2
  ),
  (
    '-- id do template criado acima --',
    'observacoes',
    'Observações',
    'textarea',
    false,
    3
  );
```

---

## ✅ Checklist Final

Antes de considerar completo, teste:

- [ ] Criar nova ficha funciona
- [ ] PDF preview renderiza
- [ ] Zoom e navegação funcionam
- [ ] Editar ficha mantém dados
- [ ] Duplicar cria nova ficha
- [ ] Status aparecem corretos
- [ ] Busca de templates funciona
- [ ] Botão "Nova Ficha" visível
- [ ] Empty states corretos
- [ ] Responsividade OK (mobile, tablet, desktop)
- [ ] Validação funciona
- [ ] Toasts aparecem
- [ ] Loading states aparecem
- [ ] Erros são tratados gracefully

---

## 🎉 Sistema Pronto!

Se todos os testes passarem, o sistema está **100% funcional** e pronto para produção!

---

**Última Atualização:** 13/10/2025 - 00:15
**Versão:** 3.0.0
**Status:** ✅ Integrado e Pronto para Teste
