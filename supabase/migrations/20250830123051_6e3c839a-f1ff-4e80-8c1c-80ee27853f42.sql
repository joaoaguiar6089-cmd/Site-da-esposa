-- Criar tabela para configurações de lembretes automáticos
CREATE TABLE IF NOT EXISTS public.reminder_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_time time without time zone NOT NULL DEFAULT '18:00:00',
  is_active boolean NOT NULL DEFAULT true,
  template_content text NOT NULL DEFAULT 'Olá {clientName}! 🔔

Este é um lembrete de que você tem um agendamento AMANHÃ:

📅 Data: {appointmentDate}
⏰ Horário: {appointmentTime}
💉 Procedimento: {procedureName}

📍 Local: Clínica Dra. Karoline - Tefé/AM

Para confirmar, alterar ou cancelar seu agendamento, acesse: https://ejqsaloqrczyfiqljcym.supabase.co/area-cliente

Obrigado! 🙏',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

-- Política para admins gerenciarem configurações de lembretes
CREATE POLICY "Admins can manage reminder settings" 
ON public.reminder_settings 
FOR ALL 
USING (is_active_admin());

-- Inserir configuração padrão se não existir
INSERT INTO public.reminder_settings (reminder_time, is_active, template_content)
VALUES ('18:00:00', true, 'Olá {clientName}! 🔔

Este é um lembrete de que você tem um agendamento AMANHÃ:

📅 Data: {appointmentDate}
⏰ Horário: {appointmentTime}
💉 Procedimento: {procedureName}

📍 Local: Clínica Dra. Karoline - Tefé/AM

Para confirmar, alterar ou cancelar seu agendamento, acesse: https://ejqsaloqrczyfiqljcym.supabase.co/area-cliente

Obrigado! 🙏')
ON CONFLICT DO NOTHING;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_reminder_settings_updated_at
  BEFORE UPDATE ON public.reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();