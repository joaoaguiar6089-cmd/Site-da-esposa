# 🏗️ Arquitetura - Sistema de Fichas Personalizadas

## 📋 Visão Geral

Sistema completo para criação, gestão e preenchimento de fichas/formulários personalizados com:
- ✅ Construtor visual drag-and-drop
- ✅ Campos dinâmicos com validação
- ✅ Lógica condicional (mostrar/ocultar campos)
- ✅ Pré-preenchimento automático
- ✅ Upload e mapeamento de PDFs
- ✅ Biblioteca de snippets reutilizáveis
- ✅ Versionamento e histórico
- ✅ Auditoria completa
- ✅ Controle de acesso por perfil

---

## 🗄️ Schema do Banco de Dados

### 1. `form_templates` - Templates de Fichas

```sql
CREATE TABLE public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'anamnese', 'consentimento', 'avaliacao', etc.
  
  -- Metadados
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  
  -- PDF Template
  pdf_template_url TEXT, -- URL do PDF base no Supabase Storage
  pdf_mapping JSONB, -- Mapeamento de campos para coordenadas do PDF
  
  -- Controle
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Auditoria
  last_edited_by UUID REFERENCES auth.users(id),
  edit_count INTEGER DEFAULT 0
);

CREATE INDEX idx_form_templates_active ON form_templates(is_active);
CREATE INDEX idx_form_templates_category ON form_templates(category);
```

### 2. `form_fields` - Campos dos Formulários

```sql
CREATE TABLE public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES form_templates(id) ON DELETE CASCADE,
  
  -- Identificação
  field_key VARCHAR(255) NOT NULL, -- 'nome_completo', 'data_nascimento', etc.
  label VARCHAR(255) NOT NULL,
  description TEXT,
  placeholder TEXT,
  
  -- Tipo e configuração
  field_type VARCHAR(50) NOT NULL, -- 'text', 'textarea', 'number', 'date', 'select', 'radio', 'checkbox', 'file', 'signature', 'header', 'divider'
  
  -- Validação
  is_required BOOLEAN DEFAULT false,
  validation_rules JSONB, -- { min: 3, max: 100, pattern: "regex", custom: "function" }
  
  -- Opções (para select, radio, checkbox)
  options JSONB, -- [{ value: 'opt1', label: 'Opção 1' }]
  
  -- Auto-preenchimento
  auto_fill_source VARCHAR(100), -- 'client.nome', 'client.data_nascimento', 'procedure.name', 'appointment.date', null
  auto_fill_mapping JSONB, -- Mapeamento personalizado
  
  -- Lógica Condicional
  conditional_logic JSONB, -- { show_if: { field: 'field_id', operator: 'equals', value: 'yes' } }
  
  -- Layout
  order_index INTEGER DEFAULT 0,
  column_span INTEGER DEFAULT 12, -- Grid de 12 colunas
  
  -- PDF Mapping
  pdf_field_name VARCHAR(255), -- Nome do campo no PDF
  pdf_coordinates JSONB, -- { x: 100, y: 200, width: 200, height: 30, page: 1 }
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_form_fields_template ON form_fields(template_id);
CREATE INDEX idx_form_fields_order ON form_fields(template_id, order_index);
```

### 3. `form_snippets` - Biblioteca de Snippets

```sql
CREATE TABLE public.form_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'dados-vitais', 'endereco', 'historico-medico', etc.
  icon VARCHAR(50), -- Nome do ícone
  
  -- Campos do snippet (JSON com estrutura de form_fields)
  fields JSONB NOT NULL,
  
  -- Controle
  is_system BOOLEAN DEFAULT false, -- Snippet criado pelo sistema (não pode ser deletado)
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  
  usage_count INTEGER DEFAULT 0
);

CREATE INDEX idx_form_snippets_category ON form_snippets(category);
```

### 4. `form_responses` - Respostas dos Clientes

```sql
CREATE TABLE public.form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  template_id UUID REFERENCES form_templates(id),
  template_version INTEGER, -- Versão do template usada
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id), -- Opcional
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'reviewed', 'archived'
  
  -- Dados
  response_data JSONB NOT NULL, -- { field_key: value }
  
  -- PDF Gerado
  generated_pdf_url TEXT,
  
  -- Controle
  submitted_at TIMESTAMP,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Conflito de versão
  version INTEGER DEFAULT 1
);

CREATE INDEX idx_form_responses_client ON form_responses(client_id);
CREATE INDEX idx_form_responses_template ON form_responses(template_id);
CREATE INDEX idx_form_responses_status ON form_responses(status);
```

### 5. `form_versions` - Histórico de Versões

```sql
CREATE TABLE public.form_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  template_id UUID REFERENCES form_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  
  -- Snapshot completo
  template_snapshot JSONB NOT NULL, -- Cópia completa do template
  fields_snapshot JSONB NOT NULL, -- Array de todos os campos
  
  -- Metadados
  change_description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(template_id, version_number)
);

CREATE INDEX idx_form_versions_template ON form_versions(template_id);
```

### 6. `form_audit_log` - Log de Auditoria

```sql
CREATE TABLE public.form_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entidade afetada
  entity_type VARCHAR(50) NOT NULL, -- 'template', 'field', 'response'
  entity_id UUID NOT NULL,
  
  -- Ação
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'publish', 'unpublish'
  
  -- Dados
  old_data JSONB,
  new_data JSONB,
  changes JSONB, -- Diff específico
  
  -- Usuário
  user_id UUID REFERENCES auth.users(id),
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  
  -- Contexto
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_form_audit_log_entity ON form_audit_log(entity_type, entity_id);
CREATE INDEX idx_form_audit_log_user ON form_audit_log(user_id);
CREATE INDEX idx_form_audit_log_created ON form_audit_log(created_at DESC);
```

### 7. `form_field_validations` - Validações Customizadas

```sql
CREATE TABLE public.form_field_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Função de validação (JavaScript)
  validation_function TEXT NOT NULL,
  error_message TEXT NOT NULL,
  
  -- Reutilizável
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 🎨 Tipos de Campos Suportados

### Campos de Entrada

| Tipo | Descrição | Configurações |
|------|-----------|---------------|
| `text` | Texto curto | maxLength, pattern, trim |
| `textarea` | Texto longo | rows, maxLength |
| `number` | Número | min, max, step, decimals |
| `email` | Email | validação automática |
| `phone` | Telefone | mask: (XX) XXXXX-XXXX |
| `cpf` | CPF | mask + validação |
| `date` | Data | min, max, disablePast |
| `time` | Horário | step, format: 24h/12h |
| `datetime` | Data + Hora | combinação |

### Campos de Seleção

| Tipo | Descrição | Configurações |
|------|-----------|---------------|
| `select` | Dropdown | options, searchable, multiple |
| `radio` | Rádio button | options, inline/stacked |
| `checkbox` | Checkbox | options, min, max |
| `toggle` | Switch on/off | defaultValue |

### Campos Especiais

| Tipo | Descrição | Configurações |
|------|-----------|---------------|
| `file` | Upload arquivo | accept, maxSize, multiple |
| `signature` | Assinatura digital | canvas, width, height |
| `rating` | Avaliação | max: 5, icon: star/heart |
| `slider` | Slider numérico | min, max, step, labels |
| `color` | Seletor de cor | format: hex/rgb |

### Campos de Layout

| Tipo | Descrição | Configurações |
|------|-----------|---------------|
| `header` | Cabeçalho de seção | level: h1-h6, style |
| `divider` | Linha divisória | style, margin |
| `spacer` | Espaço em branco | height |
| `html` | HTML customizado | content (sanitizado) |

---

## 🔄 Lógica Condicional

### Estrutura JSON

```typescript
interface ConditionalLogic {
  show_if?: {
    type: 'all' | 'any'; // AND ou OR
    conditions: Array<{
      field: string; // field_key
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
      value: any;
    }>;
  };
  
  require_if?: {
    // Mesma estrutura de show_if
  };
  
  disable_if?: {
    // Mesma estrutura de show_if
  };
}
```

### Exemplos

```json
{
  "show_if": {
    "type": "any",
    "conditions": [
      {
        "field": "ja_fez_procedimento",
        "operator": "equals",
        "value": "sim"
      },
      {
        "field": "numero_sessoes",
        "operator": "greater_than",
        "value": 0
      }
    ]
  }
}
```

---

## 🧩 Sistema de Snippets

### Snippets Pré-definidos

#### 1. Dados Pessoais Básicos
```json
{
  "name": "Dados Pessoais Básicos",
  "category": "identificacao",
  "fields": [
    {
      "field_key": "nome_completo",
      "label": "Nome Completo",
      "field_type": "text",
      "is_required": true,
      "auto_fill_source": "client.nome"
    },
    {
      "field_key": "data_nascimento",
      "label": "Data de Nascimento",
      "field_type": "date",
      "is_required": true,
      "auto_fill_source": "client.data_nascimento"
    },
    {
      "field_key": "cpf",
      "label": "CPF",
      "field_type": "cpf",
      "is_required": true,
      "auto_fill_source": "client.cpf"
    }
  ]
}
```

#### 2. Dados Vitais
```json
{
  "name": "Dados Vitais",
  "category": "saude",
  "fields": [
    {
      "field_key": "pressao_arterial",
      "label": "Pressão Arterial",
      "field_type": "text",
      "placeholder": "120/80"
    },
    {
      "field_key": "frequencia_cardiaca",
      "label": "Frequência Cardíaca",
      "field_type": "number",
      "placeholder": "bpm"
    },
    {
      "field_key": "peso",
      "label": "Peso (kg)",
      "field_type": "number",
      "validation_rules": { "min": 20, "max": 300 }
    },
    {
      "field_key": "altura",
      "label": "Altura (cm)",
      "field_type": "number",
      "validation_rules": { "min": 50, "max": 250 }
    }
  ]
}
```

#### 3. Endereço Completo
```json
{
  "name": "Endereço Completo",
  "category": "localizacao",
  "fields": [
    {
      "field_key": "cep",
      "label": "CEP",
      "field_type": "text",
      "placeholder": "00000-000",
      "validation_rules": { "pattern": "^\\d{5}-\\d{3}$" }
    },
    {
      "field_key": "logradouro",
      "label": "Logradouro",
      "field_type": "text",
      "auto_fill_source": "via_cep.logradouro"
    },
    {
      "field_key": "numero",
      "label": "Número",
      "field_type": "text",
      "column_span": 4
    },
    {
      "field_key": "complemento",
      "label": "Complemento",
      "field_type": "text",
      "column_span": 8
    },
    {
      "field_key": "bairro",
      "label": "Bairro",
      "field_type": "text"
    },
    {
      "field_key": "cidade",
      "label": "Cidade",
      "field_type": "text",
      "column_span": 8
    },
    {
      "field_key": "estado",
      "label": "UF",
      "field_type": "select",
      "column_span": 4,
      "options": [
        { "value": "SP", "label": "São Paulo" },
        { "value": "RJ", "label": "Rio de Janeiro" }
      ]
    }
  ]
}
```

#### 4. Histórico Médico
```json
{
  "name": "Histórico Médico",
  "category": "saude",
  "fields": [
    {
      "field_key": "possui_alergias",
      "label": "Possui Alergias?",
      "field_type": "radio",
      "options": [
        { "value": "sim", "label": "Sim" },
        { "value": "nao", "label": "Não" }
      ]
    },
    {
      "field_key": "lista_alergias",
      "label": "Liste as Alergias",
      "field_type": "textarea",
      "conditional_logic": {
        "show_if": {
          "type": "all",
          "conditions": [
            { "field": "possui_alergias", "operator": "equals", "value": "sim" }
          ]
        }
      }
    },
    {
      "field_key": "usa_medicamentos",
      "label": "Faz Uso de Medicamentos?",
      "field_type": "radio",
      "options": [
        { "value": "sim", "label": "Sim" },
        { "value": "nao", "label": "Não" }
      ]
    },
    {
      "field_key": "lista_medicamentos",
      "label": "Liste os Medicamentos",
      "field_type": "textarea",
      "conditional_logic": {
        "show_if": {
          "type": "all",
          "conditions": [
            { "field": "usa_medicamentos", "operator": "equals", "value": "sim" }
          ]
        }
      }
    }
  ]
}
```

---

## 📄 Mapeamento de PDF

### Estrutura de Mapeamento

```typescript
interface PDFMapping {
  template_url: string;
  fields: Array<{
    field_key: string;
    pdf_field_name: string; // Nome do campo no PDF (se for formulário PDF)
    coordinates?: {
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
      fontSize?: number;
      fontFamily?: string;
      color?: string;
      align?: 'left' | 'center' | 'right';
    };
    type: 'text' | 'checkbox' | 'signature' | 'image';
  }>;
}
```

### Ferramentas de Mapeamento

```typescript
interface PDFMapperTool {
  // Upload do PDF
  uploadPDF: (file: File) => Promise<string>;
  
  // Visualizar PDF com overlay de campos
  renderPDFWithFields: (pdfUrl: string, mapping: PDFMapping) => JSX.Element;
  
  // Arrastar e soltar campos no PDF
  addFieldToPage: (page: number, x: number, y: number, field: FormField) => void;
  
  // Ajustar tamanho e posição
  resizeField: (fieldKey: string, width: number, height: number) => void;
  moveField: (fieldKey: string, x: number, y: number) => void;
  
  // Gerar PDF preenchido
  generateFilledPDF: (pdfUrl: string, mapping: PDFMapping, data: any) => Promise<Blob>;
}
```

---

## 🔐 Segurança - RLS Policies

### form_templates

```sql
-- Admin pode criar/editar
CREATE POLICY "Admin can manage templates"
ON form_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Clientes podem ver templates publicados
CREATE POLICY "Clients can view published templates"
ON form_templates FOR SELECT
USING (is_published = true);
```

### form_responses

```sql
-- Cliente pode ver/editar apenas suas próprias respostas
CREATE POLICY "Clients can manage own responses"
ON form_responses FOR ALL
USING (client_id = (
  SELECT id FROM clients WHERE user_id = auth.uid()
));

-- Admin pode ver todas
CREATE POLICY "Admin can view all responses"
ON form_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);
```

### form_audit_log

```sql
-- Apenas admin pode ver logs
CREATE POLICY "Admin can view audit logs"
ON form_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Inserção automática via trigger
```

---

## 🎯 Fluxos de Usuário

### Admin - Criar Ficha

1. **Admin** → Área Admin → **Fichas**
2. Clicar em **"+ Nova Ficha"**
3. Preencher nome, descrição, categoria
4. Construir ficha:
   - Arrastar snippets da biblioteca
   - Adicionar campos individuais
   - Configurar validações
   - Configurar lógica condicional
5. (Opcional) Upload PDF e mapear campos
6. **Salvar como Rascunho** ou **Publicar**

### Admin - Editar Ficha

1. **Admin** → Fichas → Clicar em ficha
2. **Editar Campos**:
   - Reordenar (drag-and-drop)
   - Editar propriedades
   - Remover campos
   - Adicionar novos
3. **Salvar** → Cria nova versão automaticamente
4. Log de auditoria registra mudanças

### Cliente - Preencher Ficha

1. **Cliente** → Área do Cliente → **Fichas**
2. Clicar em **"+ Nova Ficha"**
3. Selecionar tipo de ficha disponível
4. Formulário abre com:
   - Campos pré-preenchidos (nome, CPF, etc.)
   - Campos condicionais aparecem dinamicamente
   - Validação em tempo real
   - Auto-save a cada 30 segundos
5. **Enviar** → Status: "submitted"
6. Admin pode revisar e marcar como "reviewed"

### Cliente - Visualizar Fichas Anteriores

1. **Cliente** → Área do Cliente → **Fichas**
2. Lista todas as fichas preenchidas:
   - Filtrar por tipo
   - Filtrar por data
   - Status (rascunho, enviada, revisada)
3. Clicar para visualizar (modo leitura)
4. Download PDF (se disponível)

---

## 🏗️ Estrutura de Componentes

### Admin

```
src/components/admin/forms/
├── FormTemplatesList.tsx          # Lista de templates
├── FormTemplateEditor.tsx         # Editor principal
├── FormFieldEditor.tsx            # Editor de campo individual
├── SnippetLibrary.tsx             # Biblioteca de snippets
├── ConditionalLogicBuilder.tsx    # Construtor de lógica
├── PDFMapper.tsx                  # Mapeamento de PDF
├── FormVersionHistory.tsx         # Histórico de versões
├── FormAuditLog.tsx               # Log de auditoria
└── ValidationRuleEditor.tsx       # Editor de validações
```

### Cliente

```
src/components/cliente/forms/
├── ClientFormsList.tsx            # Lista de fichas do cliente
├── FormFiller.tsx                 # Formulário de preenchimento
├── FormViewer.tsx                 # Visualização de ficha preenchida
└── FormPDFDownload.tsx            # Download de PDF
```

### Shared

```
src/components/forms/
├── DynamicField.tsx               # Renderiza campo dinamicamente
├── FieldValidation.tsx            # Componente de validação
├── ConditionalWrapper.tsx         # Wrapper para lógica condicional
└── FormProgress.tsx               # Barra de progresso
```

---

## 🔄 APIs e Hooks

### Hooks

```typescript
// Admin
useFormTemplates() // Lista, cria, edita, deleta templates
useFormFields() // Gerencia campos
useSnippets() // Gerencia snippets
useFormVersions() // Histórico de versões
useAuditLog() // Logs de auditoria

// Cliente
useClientForms() // Lista fichas do cliente
useFormResponse() // Gerencia resposta individual
useAutoFill() // Pré-preenchimento automático

// Shared
useFormValidation() // Validação de campos
useConditionalLogic() // Avaliação de lógica condicional
usePDFGeneration() // Geração de PDF
```

### Funções Edge (Supabase Functions)

```
supabase/functions/
├── generate-form-pdf/       # Gera PDF preenchido
├── validate-form-data/      # Validação server-side
├── clone-form-template/     # Clona template
└── export-form-responses/   # Exporta respostas (CSV, Excel)
```

---

## 📊 Casos de Uso Avançados

### 1. Ficha de Anamnese com Lógica Complexa

```
[Nome Completo] (pré-preenchido)
[Data de Nascimento] (pré-preenchido)

Já realizou procedimentos estéticos antes?
( ) Sim  ( ) Não

→ SE SIM:
  [Quais procedimentos?] (textarea)
  [Data do último procedimento] (date)
  [Ficou satisfeito com resultados?] (rating 1-5)

Possui histórico de:
☐ Diabetes
☐ Hipertensão
☐ Problemas cardíacos
☐ Alergias

→ SE marcou "Alergias":
  [Liste suas alergias] (textarea, required)

[Upload de exames recentes] (file, multiple, accept: .pdf, .jpg)

[Assinatura do paciente] (signature)
```

### 2. Termo de Consentimento com PDF

- Upload do PDF do termo legal
- Mapear campos: nome, CPF, data, procedimento
- Mapear zona de assinatura
- Cliente preenche campos + assina digitalmente
- Sistema gera PDF final preenchido
- Armazenado no Storage do Supabase

### 3. Avaliação Pós-Procedimento

- Ficha enviada automaticamente 7 dias após procedimento
- Campos de satisfação (rating)
- Upload de fotos do resultado
- Observações sobre recuperação
- Admin recebe notificação quando preenchida

---

## 🔄 Versionamento

### Estratégia

- Cada edição de template cria nova versão
- Respostas existentes mantêm referência à versão usada
- Admin pode reverter para versão anterior
- Diff visual entre versões

### Estrutura

```typescript
interface TemplateVersion {
  version_number: number;
  created_at: Date;
  created_by: User;
  change_description: string;
  template_snapshot: FormTemplate;
  fields_snapshot: FormField[];
}
```

---

## 🎨 UI/UX

### Form Builder (Admin)

- **Drag-and-drop** de campos da paleta
- **Preview em tempo real** ao lado
- **Responsivo**: preview mobile/tablet/desktop
- **Grid de 12 colunas** para layout flexível
- **Undo/Redo** de ações

### Form Filler (Cliente)

- **Auto-save** a cada 30s
- **Validação inline** (não apenas no submit)
- **Progress bar** para fichas longas
- **Campos condicionais** aparecem com animação suave
- **Mobile-first** design

---

## 📈 Métricas e Analytics

### Dados a Rastrear

- Taxa de preenchimento por ficha
- Tempo médio de preenchimento
- Campos que mais causam erros de validação
- Taxa de abandono por seção
- Fichas mais usadas

### Dashboard Admin

```
src/components/admin/forms/FormAnalytics.tsx
```

---

## ✅ Checklist de Segurança

- ✅ RLS policies em todas as tabelas
- ✅ Validação server-side (não apenas client)
- ✅ Sanitização de HTML customizado
- ✅ Rate limiting em uploads
- ✅ Verificação de tipos de arquivo
- ✅ Criptografia de dados sensíveis (se necessário)
- ✅ Logs de auditoria completos
- ✅ Controle de versão para prevenção de conflitos
- ✅ CORS configurado corretamente
- ✅ Autenticação em todas as rotas

---

## 🚀 Próximos Passos

1. ✅ Criar migrations do banco
2. ✅ Definir types TypeScript
3. ✅ Implementar componentes Admin
4. ✅ Implementar componentes Cliente
5. ✅ Integrar PDF mapping
6. ✅ Testes E2E
7. ✅ Documentação de uso

---

**Arquitetura aprovada?** Posso começar a implementação! 🎯
