-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage notification settings" 
ON public.notification_settings 
FOR ALL 
USING (is_active_admin());

-- Insert default settings
INSERT INTO public.notification_settings (setting_key, setting_value, description) VALUES
('owner_phone', '5597984387295', 'Número da proprietária para notificações'),
('new_appointment_template', 'Nova solicitação de agendamento recebida!\n\n👤 Cliente: {clientName}\n📱 Telefone: {clientPhone}\n📅 Data: {appointmentDate}\n⏰ Horário: {appointmentTime}\n🏥 Procedimento: {procedureName}{notes}', 'Template para notificação de novo agendamento'),
('appointment_change_template', 'Agendamento alterado!\n\n👤 Cliente: {clientName}\n📱 Telefone: {clientPhone}\n📅 Nova Data: {appointmentDate}\n⏰ Novo Horário: {appointmentTime}\n🏥 Procedimento: {procedureName}{notes}', 'Template para notificação de alteração de agendamento'),
('appointment_cancel_template', 'Agendamento cancelado!\n\n👤 Cliente: {clientName}\n📱 Telefone: {clientPhone}\n📅 Data: {appointmentDate}\n⏰ Horário: {appointmentTime}\n🏥 Procedimento: {procedureName}', 'Template para notificação de cancelamento de agendamento');

-- Create trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();