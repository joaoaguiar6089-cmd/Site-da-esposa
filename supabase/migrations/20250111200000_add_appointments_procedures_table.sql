-- Migration: Suporte para múltiplos procedimentos por agendamento
-- Cria tabela de junção para relacionamento N:N entre appointments e procedures

-- Criar tabela de junção appointments_procedures
CREATE TABLE IF NOT EXISTS public.appointments_procedures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE RESTRICT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Garantir que não haja duplicatas para o mesmo appointment+procedure
  UNIQUE(appointment_id, procedure_id)
);

-- Índices para melhor performance
CREATE INDEX idx_appointments_procedures_appointment ON public.appointments_procedures(appointment_id);
CREATE INDEX idx_appointments_procedures_procedure ON public.appointments_procedures(procedure_id);
CREATE INDEX idx_appointments_procedures_order ON public.appointments_procedures(appointment_id, order_index);

-- Comentários
COMMENT ON TABLE public.appointments_procedures IS 'Tabela de junção para relacionamento N:N entre appointments e procedures';
COMMENT ON COLUMN public.appointments_procedures.appointment_id IS 'ID do agendamento';
COMMENT ON COLUMN public.appointments_procedures.procedure_id IS 'ID do procedimento';
COMMENT ON COLUMN public.appointments_procedures.order_index IS 'Ordem do procedimento no agendamento (0, 1, 2, etc)';

-- Habilitar RLS
ALTER TABLE public.appointments_procedures ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Permitir leitura para todos autenticados
CREATE POLICY "Permitir leitura de appointments_procedures para autenticados"
  ON public.appointments_procedures
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir insert/update/delete apenas para admins
CREATE POLICY "Permitir insert de appointments_procedures para admins"
  ON public.appointments_procedures
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Permitir update de appointments_procedures para admins"
  ON public.appointments_procedures
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Permitir delete de appointments_procedures para admins"
  ON public.appointments_procedures
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Migrar dados existentes: copiar procedure_id de appointments para appointments_procedures
INSERT INTO public.appointments_procedures (appointment_id, procedure_id, order_index)
SELECT id, procedure_id, 0
FROM public.appointments
WHERE procedure_id IS NOT NULL
ON CONFLICT (appointment_id, procedure_id) DO NOTHING;

-- Comentário: Mantemos a coluna procedure_id em appointments por compatibilidade
-- Ela será usada como "procedimento principal" e sincronizada com appointments_procedures
COMMENT ON COLUMN public.appointments.procedure_id IS 'Procedimento principal (mantido por compatibilidade). Use appointments_procedures para múltiplos procedimentos.';
