-- =====================================================
-- FIX: RLS Policies para Form System
-- =====================================================
-- Problema: Policies estavam verificando auth.users.raw_user_meta_data
-- Solução: Usar a tabela admin_users que já existe no sistema
-- =====================================================

-- Drop policies antigas
DROP POLICY IF EXISTS "Admin can manage all form templates" ON public.form_templates;
DROP POLICY IF EXISTS "Clients can view published form templates" ON public.form_templates;
DROP POLICY IF EXISTS "Admin can manage all form fields" ON public.form_fields;
DROP POLICY IF EXISTS "Clients can view fields of published templates" ON public.form_fields;
DROP POLICY IF EXISTS "Admin can manage form snippets" ON public.form_snippets;
DROP POLICY IF EXISTS "Admin can manage all form responses" ON public.form_responses;
DROP POLICY IF EXISTS "Authenticated users can create form responses" ON public.form_responses;
DROP POLICY IF EXISTS "Users can view form responses" ON public.form_responses;
DROP POLICY IF EXISTS "Admin can view form versions" ON public.form_versions;
DROP POLICY IF EXISTS "Admin can view form audit logs" ON public.form_audit_log;
DROP POLICY IF EXISTS "Admin can manage form field validations" ON public.form_field_validations;

-- =====================================================
-- POLICIES: form_templates
-- =====================================================

-- Admin pode fazer tudo (usando admin_users)
CREATE POLICY "Admin can manage all form templates"
ON public.form_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.is_active = true
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
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.is_active = true
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

-- Apenas admin pode gerenciar snippets
CREATE POLICY "Admin can manage form snippets"
ON public.form_snippets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.is_active = true
  )
);

-- =====================================================
-- POLICIES: form_responses
-- =====================================================

-- Admin pode gerenciar todas as respostas
CREATE POLICY "Admin can manage all form responses"
ON public.form_responses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.is_active = true
  )
);

-- Usuários autenticados podem criar respostas
CREATE POLICY "Authenticated users can create form responses"
ON public.form_responses FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Usuários podem ver suas próprias respostas OU admin pode ver todas
CREATE POLICY "Users can view form responses"
ON public.form_responses FOR SELECT
USING (
  -- Admin pode ver tudo
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.is_active = true
  )
  -- OU: Cliente pode ver suas próprias (futuramente quando tivermos user_id em clients)
  -- Por enquanto, apenas admin tem acesso
);

-- =====================================================
-- POLICIES: form_versions
-- =====================================================

-- Apenas admin pode ver versões
CREATE POLICY "Admin can view form versions"
ON public.form_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.is_active = true
  )
);

-- =====================================================
-- POLICIES: form_audit_log
-- =====================================================

-- Apenas admin pode ver audit log
CREATE POLICY "Admin can view form audit logs"
ON public.form_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.is_active = true
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
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.is_active = true
  )
);
