-- Criar tabela para configurações de horários disponíveis
CREATE TABLE public.schedule_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '18:00:00',
  interval_minutes INTEGER NOT NULL DEFAULT 60,
  available_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6}', -- 0=domingo, 1=segunda, etc
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.schedule_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Qualquer um pode ver configurações ativas" 
ON public.schedule_settings 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins podem gerenciar configurações" 
ON public.schedule_settings 
FOR ALL 
USING (is_active_admin());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_schedule_settings_updated_at
  BEFORE UPDATE ON public.schedule_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configuração padrão
INSERT INTO public.schedule_settings (start_time, end_time, interval_minutes, available_days)
VALUES ('08:00:00', '18:00:00', 60, '{1,2,3,4,5,6}');

-- Função para verificar conflitos de agendamento
CREATE OR REPLACE FUNCTION public.check_appointment_conflict(
  p_appointment_date DATE,
  p_appointment_time TIME,
  p_professional_id UUID,
  p_procedure_id UUID,
  p_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  procedure_duration INTEGER;
  conflict_exists BOOLEAN := false;
BEGIN
  -- Buscar duração do procedimento
  SELECT duration INTO procedure_duration
  FROM public.procedures
  WHERE id = p_procedure_id;
  
  -- Verificar conflitos considerando a duração do procedimento
  SELECT EXISTS(
    SELECT 1 
    FROM public.appointments a
    JOIN public.procedures pr ON a.procedure_id = pr.id
    WHERE a.appointment_date = p_appointment_date
    AND a.professional_id = p_professional_id
    AND a.status != 'cancelado'
    AND (p_appointment_id IS NULL OR a.id != p_appointment_id)
    AND (
      -- Novo agendamento sobrepõe com existente
      (p_appointment_time >= a.appointment_time 
       AND p_appointment_time < (a.appointment_time + (pr.duration || ' minutes')::INTERVAL))
      OR
      -- Agendamento existente sobrepõe com novo
      (a.appointment_time >= p_appointment_time 
       AND a.appointment_time < (p_appointment_time + (procedure_duration || ' minutes')::INTERVAL))
    )
  ) INTO conflict_exists;
  
  RETURN conflict_exists;
END;
$$;