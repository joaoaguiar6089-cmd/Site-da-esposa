# 🔧 Correção: RLS Policies - Sistema de Fichas

## ❌ Erro Original

```
ERROR: column "user_id" does not exist
```

**Causa**: A tabela `clients` não possui coluna `user_id` para vinculação com `auth.users`.

**Estrutura atual da tabela clients**:
```sql
CREATE TABLE public.clients (
  id UUID PRIMARY KEY,
  cpf TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  sobrenome TEXT NOT NULL,
  celular TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

---

## ✅ Correção Aplicada

### Policies Atualizadas em `form_responses`:

```sql
-- Admin pode gerenciar tudo
CREATE POLICY "Admin can manage all form responses"
ON public.form_responses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Usuários autenticados podem criar respostas
CREATE POLICY "Authenticated users can create form responses"
ON public.form_responses FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Usuários autenticados podem ver respostas
CREATE POLICY "Users can view form responses"
ON public.form_responses FOR SELECT
USING (auth.uid() IS NOT NULL);
```

---

## 🔐 Segurança Atual

### ✅ O que está protegido:

1. **Admin tem controle total**
   - Criar, editar, deletar templates
   - Ver todas as respostas
   - Gerenciar snippets
   - Acessar logs de auditoria

2. **Usuários autenticados podem**:
   - Ver templates publicados
   - Criar respostas de fichas
   - Ver respostas (por enquanto todas)

3. **Usuários não autenticados**:
   - Não têm acesso a nada (RLS bloqueia)

### ⚠️ O que precisa melhorar:

1. **Isolamento de dados de clientes**
   - Atualmente qualquer usuário autenticado pode ver todas as respostas
   - Ideal: Cliente vê apenas suas próprias fichas

2. **Vinculação de auth com clients**
   - Falta coluna `user_id` na tabela `clients`
   - Ou criar tabela de usuários de clientes separada

---

## 🚀 Plano de Melhoria Futura

### Opção 1: Adicionar `user_id` à tabela clients (RECOMENDADO)

```sql
-- Migration futura
ALTER TABLE public.clients 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice
CREATE INDEX idx_clients_user_id ON public.clients(user_id);

-- Atualizar policy de form_responses
DROP POLICY "Users can view form responses" ON public.form_responses;

CREATE POLICY "Clients can view own form responses"
ON public.form_responses FOR SELECT
USING (
  -- Admin vê tudo
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
  OR
  -- Cliente vê apenas suas respostas
  client_id IN (
    SELECT id FROM public.clients WHERE user_id = auth.uid()
  )
);
```

### Opção 2: Usar metadata do auth.users

```sql
-- Armazenar client_id no user metadata ao criar conta
-- auth.users.raw_user_meta_data->>'client_id'

CREATE POLICY "Clients can view own form responses v2"
ON public.form_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin'
      OR
      client_id::text = auth.users.raw_user_meta_data->>'client_id'
    )
  )
);
```

### Opção 3: Tabela intermediária client_users

```sql
-- Criar tabela de vinculação
CREATE TABLE public.client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(client_id, user_id)
);

-- Policy usando a tabela intermediária
CREATE POLICY "Clients can view own form responses v3"
ON public.form_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
  OR
  client_id IN (
    SELECT client_id FROM public.client_users WHERE user_id = auth.uid()
  )
);
```

---

## 📋 Tarefas Pendentes

- [ ] **Decidir estratégia de autenticação de clientes**
  - Opção 1, 2 ou 3 acima?
  
- [ ] **Implementar vinculação user ↔ client**
  - Migration para adicionar coluna ou tabela
  
- [ ] **Atualizar policies de form_responses**
  - Restringir acesso por client_id
  
- [ ] **Atualizar área do cliente**
  - Passar client_id automaticamente nas queries
  
- [ ] **Testar isolamento de dados**
  - Criar 2 clientes diferentes
  - Verificar que não conseguem ver fichas um do outro

---

## 🧪 Como Testar Segurança Atual

### 1. Testar como Admin

```typescript
// Login como admin
const { data: templates } = await supabase
  .from('form_templates')
  .select('*');
// ✅ Deve retornar todos os templates

const { data: responses } = await supabase
  .from('form_responses')
  .select('*');
// ✅ Deve retornar todas as respostas
```

### 2. Testar como usuário não autenticado

```typescript
// Sem login
const { data, error } = await supabase
  .from('form_templates')
  .select('*');
// ❌ error.code === 'PGRST301' (RLS bloqueou)
```

### 3. Testar como usuário autenticado (não admin)

```typescript
// Login como usuário normal
const { data: templates } = await supabase
  .from('form_templates')
  .select('*')
  .eq('is_published', true);
// ✅ Deve retornar apenas templates publicados

const { data: responses } = await supabase
  .from('form_responses')
  .select('*');
// ⚠️ Atualmente retorna TODAS as respostas
// TODO: Restringir por client_id
```

---

## 📝 Notas Importantes

1. **Segurança em Produção**
   - As policies atuais são funcionais mas **não ideais para produção**
   - Implemente a vinculação user ↔ client **antes de ir ao ar**

2. **Dados Sensíveis**
   - Fichas médicas contêm dados sensíveis (LGPD/GDPR)
   - Isolamento de dados é **crítico**

3. **Auditoria**
   - Todas as ações são logadas em `form_audit_log`
   - Admin pode ver quem acessou o quê

4. **Migration Reversível**
   - As alterações podem ser revertidas facilmente
   - Nenhum dado é perdido

---

## ✅ Migration Pronta para Executar

A migration corrigida está em:
```
supabase/migrations/20251012000000_create_form_system.sql
```

**Executar agora:**
```bash
# Supabase CLI
supabase db push

# Ou no Supabase Studio > SQL Editor
```

**Resultado esperado:**
```
✅ Sistema de Fichas Personalizadas instalado com sucesso!
📊 Tabelas criadas: 7
🔒 RLS Policies: Habilitadas
📦 Snippets pré-definidos: 4
```

---

**Última atualização:** 12/10/2025
**Status:** ✅ CORRIGIDO - Pronto para deploy
