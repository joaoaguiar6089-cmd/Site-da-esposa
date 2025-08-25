-- Criar tabela para exceções de horários (dias específicos com horários diferentes ou fechamento)
CREATE TABLE public.schedule_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_start DATE NOT NULL,
  date_end DATE,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  custom_start_time TIME,
  custom_end_time TIME,
  custom_interval_minutes INTEGER,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins podem gerenciar exceções de horários" 
ON public.schedule_exceptions 
FOR ALL 
USING (is_active_admin());

CREATE POLICY "Qualquer um pode ver exceções ativas" 
ON public.schedule_exceptions 
FOR SELECT 
USING (date_end IS NULL OR date_end >= CURRENT_DATE);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_schedule_exceptions_updated_at
BEFORE UPDATE ON public.schedule_exceptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();