-- =====================================================
-- SISTEMA DE FICHAS PERSONALIZADAS
-- Migration: 20251012000000
-- Descrição: Schema completo para criação e gestão de fichas/formulários
-- =====================================================

-- =====================================================
-- 1. TEMPLATES DE FICHAS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'anamnese', 'consentimento', 'avaliacao', 'cadastro', etc.
  
  -- Metadados
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  
  -- PDF Template (opcional)
  pdf_template_url TEXT, -- URL no Supabase Storage
  pdf_mapping JSONB DEFAULT '[]'::jsonb, -- Mapeamento de campos para coordenadas do PDF
  
  -- Controle
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Auditoria
  last_edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  edit_count INTEGER DEFAULT 0,
  
  -- Constraints
  CONSTRAINT form_templates_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT form_templates_version_positive CHECK (version > 0)
);

-- Índices
CREATE INDEX idx_form_templates_active ON public.form_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_form_templates_published ON public.form_templates(is_published) WHERE is_published = true;
CREATE INDEX idx_form_templates_category ON public.form_templates(category);
CREATE INDEX idx_form_templates_created_at ON public.form_templates(created_at DESC);

-- Comentários
COMMENT ON TABLE public.form_templates IS 'Templates de fichas/formulários personalizados';
COMMENT ON COLUMN public.form_templates.pdf_mapping IS 'Array de objetos: [{ field_key, pdf_field_name, coordinates: { page, x, y, width, height } }]';

-- =====================================================
-- 2. CAMPOS DOS FORMULÁRIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  
  -- Identificação
  field_key VARCHAR(255) NOT NULL, -- Identificador único dentro do template
  label VARCHAR(255) NOT NULL,
  description TEXT,
  placeholder TEXT,
  help_text TEXT,
  
  -- Tipo de campo
  field_type VARCHAR(50) NOT NULL, -- 'text', 'textarea', 'number', 'date', 'select', 'radio', 'checkbox', 'file', 'signature', 'header', 'divider', etc.
  
  -- Validação
  is_required BOOLEAN DEFAULT false,
  validation_rules JSONB DEFAULT '{}'::jsonb, -- { min, max, pattern, custom, minLength, maxLength, etc. }
  
  -- Opções (para select, radio, checkbox)
  options JSONB DEFAULT '[]'::jsonb, -- [{ value: 'opt1', label: 'Opção 1', color: '#xxx' }]
  
  -- Auto-preenchimento
  auto_fill_source VARCHAR(100), -- 'client.nome', 'client.cpf', 'procedure.name', 'appointment.date', null
  auto_fill_mapping JSONB, -- Mapeamento personalizado ou transformação
  
  -- Lógica Condicional
  conditional_logic JSONB DEFAULT '{}'::jsonb, -- { show_if: {...}, require_if: {...}, disable_if: {...} }
  
  -- Layout
  order_index INTEGER DEFAULT 0,
  column_span INTEGER DEFAULT 12, -- Grid de 12 colunas
  
  -- PDF Mapping
  pdf_field_name VARCHAR(255), -- Nome do campo no PDF formulário
  pdf_coordinates JSONB, -- { x, y, width, height, page, fontSize, fontFamily, color, align }
  
  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT form_fields_key_not_empty CHECK (length(trim(field_key)) > 0),
  CONSTRAINT form_fields_label_not_empty CHECK (length(trim(label)) > 0),
  CONSTRAINT form_fields_column_span_valid CHECK (column_span >= 1 AND column_span <= 12),
  CONSTRAINT form_fields_unique_key_per_template UNIQUE(template_id, field_key)
);

-- Índices
CREATE INDEX idx_form_fields_template ON public.form_fields(template_id);
CREATE INDEX idx_form_fields_order ON public.form_fields(template_id, order_index);
CREATE INDEX idx_form_fields_type ON public.form_fields(field_type);

-- Comentários
COMMENT ON TABLE public.form_fields IS 'Campos que compõem cada template de ficha';
COMMENT ON COLUMN public.form_fields.field_key IS 'Chave única do campo dentro do template (ex: nome_completo, cpf)';
COMMENT ON COLUMN public.form_fields.conditional_logic IS 'Lógica para mostrar/ocultar/requer campo baseado em outros campos';

-- =====================================================
-- 3. BIBLIOTECA DE SNIPPETS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.form_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'dados-pessoais', 'endereco', 'saude', 'avaliacao', etc.
  icon VARCHAR(50), -- Nome do ícone (ex: 'user', 'heart', 'map-pin')
  
  -- Campos do snippet (array de objetos com estrutura de form_fields)
  fields JSONB NOT NULL,
  
  -- Controle
  is_system BOOLEAN DEFAULT false, -- Snippet do sistema (não pode ser deletado)
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Estatísticas
  usage_count INTEGER DEFAULT 0,
  
  -- Constraints
  CONSTRAINT form_snippets_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Índices
CREATE INDEX idx_form_snippets_category ON public.form_snippets(category);
CREATE INDEX idx_form_snippets_active ON public.form_snippets(is_active) WHERE is_active = true;
CREATE INDEX idx_form_snippets_usage ON public.form_snippets(usage_count DESC);

-- Comentários
COMMENT ON TABLE public.form_snippets IS 'Biblioteca de blocos reutilizáveis de campos';
COMMENT ON COLUMN public.form_snippets.fields IS 'Array de definições de campos: [{ field_key, label, field_type, ... }]';

-- =====================================================
-- 4. RESPOSTAS DOS CLIENTES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE RESTRICT,
  template_version INTEGER NOT NULL, -- Versão do template usada no momento do preenchimento
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL, -- Opcional: vincula a um agendamento
  
  -- Status do preenchimento
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'reviewed', 'archived'
  
  -- Dados preenchidos
  response_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- { field_key: value }
  
  -- PDF Gerado (se houver template PDF)
  generated_pdf_url TEXT,
  generated_pdf_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Controle de usuários
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Controle de versão (para prevenir conflitos concorrentes)
  version INTEGER DEFAULT 1,
  
  -- Constraints
  CONSTRAINT form_responses_status_valid CHECK (status IN ('draft', 'submitted', 'reviewed', 'archived')),
  CONSTRAINT form_responses_version_positive CHECK (version > 0)
);

-- Índices
CREATE INDEX idx_form_responses_client ON public.form_responses(client_id);
CREATE INDEX idx_form_responses_template ON public.form_responses(template_id);
CREATE INDEX idx_form_responses_appointment ON public.form_responses(appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX idx_form_responses_status ON public.form_responses(status);
CREATE INDEX idx_form_responses_created_at ON public.form_responses(created_at DESC);
CREATE INDEX idx_form_responses_submitted_at ON public.form_responses(submitted_at DESC) WHERE submitted_at IS NOT NULL;

-- Comentários
COMMENT ON TABLE public.form_responses IS 'Respostas preenchidas pelos clientes';
COMMENT ON COLUMN public.form_responses.response_data IS 'Objeto com pares field_key: valor preenchido';
COMMENT ON COLUMN public.form_responses.version IS 'Versão do documento para controle de concorrência';

-- =====================================================
-- 5. HISTÓRICO DE VERSÕES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.form_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  
  -- Snapshot completo do template e campos
  template_snapshot JSONB NOT NULL, -- Cópia do registro form_templates
  fields_snapshot JSONB NOT NULL, -- Array de todos os form_fields
  
  -- Metadados da versão
  change_description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT form_versions_unique_version UNIQUE(template_id, version_number),
  CONSTRAINT form_versions_version_positive CHECK (version_number > 0)
);

-- Índices
CREATE INDEX idx_form_versions_template ON public.form_versions(template_id, version_number DESC);
CREATE INDEX idx_form_versions_created_at ON public.form_versions(created_at DESC);

-- Comentários
COMMENT ON TABLE public.form_versions IS 'Histórico de todas as versões de cada template';
COMMENT ON COLUMN public.form_versions.template_snapshot IS 'Snapshot do template nesta versão';
COMMENT ON COLUMN public.form_versions.fields_snapshot IS 'Array de todos os campos nesta versão';

-- =====================================================
-- 6. LOG DE AUDITORIA
-- =====================================================

CREATE TABLE IF NOT EXISTS public.form_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entidade afetada
  entity_type VARCHAR(50) NOT NULL, -- 'template', 'field', 'response', 'snippet'
  entity_id UUID NOT NULL,
  
  -- Ação realizada
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'publish', 'unpublish', 'submit', 'review'
  
  -- Dados
  old_data JSONB,
  new_data JSONB,
  changes JSONB, -- Diff específico (campos alterados)
  
  -- Usuário que realizou a ação
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  
  -- Contexto técnico
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT form_audit_log_entity_type_valid CHECK (entity_type IN ('template', 'field', 'response', 'snippet')),
  CONSTRAINT form_audit_log_action_valid CHECK (action IN ('create', 'update', 'delete', 'publish', 'unpublish', 'submit', 'review', 'clone', 'restore'))
);

-- Índices
CREATE INDEX idx_form_audit_log_entity ON public.form_audit_log(entity_type, entity_id);
CREATE INDEX idx_form_audit_log_user ON public.form_audit_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_form_audit_log_created_at ON public.form_audit_log(created_at DESC);
CREATE INDEX idx_form_audit_log_action ON public.form_audit_log(action);

-- Comentários
COMMENT ON TABLE public.form_audit_log IS 'Log de auditoria de todas as ações no sistema de fichas';

-- =====================================================
-- 7. VALIDAÇÕES CUSTOMIZADAS (opcional)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.form_field_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  
  -- Função de validação (JavaScript que será executada no frontend)
  validation_function TEXT NOT NULL,
  error_message TEXT NOT NULL,
  
  -- Controle
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT form_field_validations_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Índices
CREATE INDEX idx_form_field_validations_active ON public.form_field_validations(is_active) WHERE is_active = true;

-- Comentários
COMMENT ON TABLE public.form_field_validations IS 'Validações customizadas reutilizáveis';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON public.form_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_fields_updated_at
  BEFORE UPDATE ON public.form_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_snippets_updated_at
  BEFORE UPDATE ON public.form_snippets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_responses_updated_at
  BEFORE UPDATE ON public.form_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_field_validations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES: form_templates
-- =====================================================

-- Admin pode fazer tudo
CREATE POLICY "Admin can manage all form templates"
ON public.form_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Clientes podem ver apenas templates publicados
CREATE POLICY "Clients can view published form templates"
ON public.form_templates FOR SELECT
USING (is_published = true AND is_active = true);

-- =====================================================
-- POLICIES: form_fields
-- =====================================================

-- Admin pode gerenciar todos os campos
CREATE POLICY "Admin can manage all form fields"
ON public.form_fields FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Clientes podem ver campos de templates publicados
CREATE POLICY "Clients can view fields of published templates"
ON public.form_fields FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.form_templates
    WHERE form_templates.id = form_fields.template_id
    AND form_templates.is_published = true
    AND form_templates.is_active = true
  )
);

-- =====================================================
-- POLICIES: form_snippets
-- =====================================================

-- Admin pode gerenciar snippets
CREATE POLICY "Admin can manage form snippets"
ON public.form_snippets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Clientes não veem snippets (são para admins)
-- Sem policy de SELECT para clientes

-- =====================================================
-- POLICIES: form_responses
-- =====================================================

-- Admin pode gerenciar todas as respostas
CREATE POLICY "Admin can manage all form responses"
ON public.form_responses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Política pública para criação (temporária - ajustar quando implementar auth de clientes)
-- Permite que qualquer usuário autenticado crie respostas
CREATE POLICY "Authenticated users can create form responses"
ON public.form_responses FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Política pública para leitura de próprias respostas (temporária)
-- Por enquanto, permite leitura baseada apenas em estar autenticado
-- TODO: Implementar auth completa de clientes e restringir por client_id
CREATE POLICY "Users can view form responses"
ON public.form_responses FOR SELECT
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- POLICIES: form_versions
-- =====================================================

-- Apenas admin pode ver versões
CREATE POLICY "Admin can view form versions"
ON public.form_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- =====================================================
-- POLICIES: form_audit_log
-- =====================================================

-- Apenas admin pode ver logs de auditoria
CREATE POLICY "Admin can view form audit logs"
ON public.form_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- =====================================================
-- POLICIES: form_field_validations
-- =====================================================

-- Admin pode gerenciar validações
CREATE POLICY "Admin can manage form field validations"
ON public.form_field_validations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- =====================================================
-- DADOS INICIAIS: SNIPPETS PRÉ-DEFINIDOS
-- =====================================================

-- Snippet: Dados Pessoais Básicos
INSERT INTO public.form_snippets (name, description, category, icon, fields, is_system, is_active)
VALUES (
  'Dados Pessoais Básicos',
  'Nome completo, data de nascimento e CPF',
  'identificacao',
  'user',
  '[
    {
      "field_key": "nome_completo",
      "label": "Nome Completo",
      "field_type": "text",
      "is_required": true,
      "auto_fill_source": "client.nome",
      "column_span": 12,
      "order_index": 0
    },
    {
      "field_key": "data_nascimento",
      "label": "Data de Nascimento",
      "field_type": "date",
      "is_required": true,
      "auto_fill_source": "client.data_nascimento",
      "column_span": 6,
      "order_index": 1
    },
    {
      "field_key": "cpf",
      "label": "CPF",
      "field_type": "cpf",
      "is_required": true,
      "auto_fill_source": "client.cpf",
      "column_span": 6,
      "order_index": 2
    }
  ]'::jsonb,
  true,
  true
);

-- Snippet: Contato
INSERT INTO public.form_snippets (name, description, category, icon, fields, is_system, is_active)
VALUES (
  'Informações de Contato',
  'Email, telefone e WhatsApp',
  'contato',
  'phone',
  '[
    {
      "field_key": "email",
      "label": "Email",
      "field_type": "email",
      "is_required": true,
      "auto_fill_source": "client.email",
      "column_span": 12,
      "order_index": 0
    },
    {
      "field_key": "telefone",
      "label": "Telefone",
      "field_type": "phone",
      "is_required": true,
      "auto_fill_source": "client.telefone",
      "column_span": 6,
      "order_index": 1
    },
    {
      "field_key": "whatsapp",
      "label": "WhatsApp",
      "field_type": "phone",
      "placeholder": "(XX) XXXXX-XXXX",
      "column_span": 6,
      "order_index": 2
    }
  ]'::jsonb,
  true,
  true
);

-- Snippet: Endereço Completo
INSERT INTO public.form_snippets (name, description, category, icon, fields, is_system, is_active)
VALUES (
  'Endereço Completo',
  'CEP, logradouro, número, complemento, bairro, cidade e UF',
  'localizacao',
  'map-pin',
  '[
    {
      "field_key": "cep",
      "label": "CEP",
      "field_type": "text",
      "placeholder": "00000-000",
      "validation_rules": {"pattern": "^\\d{5}-\\d{3}$"},
      "column_span": 4,
      "order_index": 0
    },
    {
      "field_key": "logradouro",
      "label": "Logradouro",
      "field_type": "text",
      "column_span": 8,
      "order_index": 1
    },
    {
      "field_key": "numero",
      "label": "Número",
      "field_type": "text",
      "column_span": 3,
      "order_index": 2
    },
    {
      "field_key": "complemento",
      "label": "Complemento",
      "field_type": "text",
      "column_span": 9,
      "order_index": 3
    },
    {
      "field_key": "bairro",
      "label": "Bairro",
      "field_type": "text",
      "column_span": 6,
      "order_index": 4
    },
    {
      "field_key": "cidade",
      "label": "Cidade",
      "field_type": "text",
      "column_span": 4,
      "order_index": 5
    },
    {
      "field_key": "uf",
      "label": "UF",
      "field_type": "select",
      "options": [
        {"value": "AC", "label": "AC"}, {"value": "AL", "label": "AL"}, {"value": "AP", "label": "AP"},
        {"value": "AM", "label": "AM"}, {"value": "BA", "label": "BA"}, {"value": "CE", "label": "CE"},
        {"value": "DF", "label": "DF"}, {"value": "ES", "label": "ES"}, {"value": "GO", "label": "GO"},
        {"value": "MA", "label": "MA"}, {"value": "MT", "label": "MT"}, {"value": "MS", "label": "MS"},
        {"value": "MG", "label": "MG"}, {"value": "PA", "label": "PA"}, {"value": "PB", "label": "PB"},
        {"value": "PR", "label": "PR"}, {"value": "PE", "label": "PE"}, {"value": "PI", "label": "PI"},
        {"value": "RJ", "label": "RJ"}, {"value": "RN", "label": "RN"}, {"value": "RS", "label": "RS"},
        {"value": "RO", "label": "RO"}, {"value": "RR", "label": "RR"}, {"value": "SC", "label": "SC"},
        {"value": "SP", "label": "SP"}, {"value": "SE", "label": "SE"}, {"value": "TO", "label": "TO"}
      ],
      "column_span": 2,
      "order_index": 6
    }
  ]'::jsonb,
  true,
  true
);

-- Snippet: Histórico Médico
INSERT INTO public.form_snippets (name, description, category, icon, fields, is_system, is_active)
VALUES (
  'Histórico Médico',
  'Alergias, medicamentos e condições médicas',
  'saude',
  'heart',
  '[
    {
      "field_key": "possui_alergias",
      "label": "Possui Alergias?",
      "field_type": "radio",
      "options": [
        {"value": "sim", "label": "Sim"},
        {"value": "nao", "label": "Não"}
      ],
      "column_span": 12,
      "order_index": 0
    },
    {
      "field_key": "lista_alergias",
      "label": "Liste suas Alergias",
      "field_type": "textarea",
      "placeholder": "Descreva suas alergias...",
      "conditional_logic": {
        "show_if": {
          "type": "all",
          "conditions": [{"field": "possui_alergias", "operator": "equals", "value": "sim"}]
        }
      },
      "column_span": 12,
      "order_index": 1
    },
    {
      "field_key": "usa_medicamentos",
      "label": "Faz Uso de Medicamentos?",
      "field_type": "radio",
      "options": [
        {"value": "sim", "label": "Sim"},
        {"value": "nao", "label": "Não"}
      ],
      "column_span": 12,
      "order_index": 2
    },
    {
      "field_key": "lista_medicamentos",
      "label": "Liste os Medicamentos",
      "field_type": "textarea",
      "placeholder": "Nome, dosagem e frequência...",
      "conditional_logic": {
        "show_if": {
          "type": "all",
          "conditions": [{"field": "usa_medicamentos", "operator": "equals", "value": "sim"}]
        }
      },
      "column_span": 12,
      "order_index": 3
    }
  ]'::jsonb,
  true,
  true
);

-- =====================================================
-- SUCESSO!
-- =====================================================

-- Verificação final
DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de Fichas Personalizadas instalado com sucesso!';
  RAISE NOTICE '📊 Tabelas criadas: 7';
  RAISE NOTICE '🔒 RLS Policies: Habilitadas';
  RAISE NOTICE '📦 Snippets pré-definidos: 4';
END $$;
