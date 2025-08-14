-- Create table for WhatsApp message templates
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT NOT NULL UNIQUE,
  template_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view templates" 
ON public.whatsapp_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage templates" 
ON public.whatsapp_templates 
FOR ALL 
USING (is_active_admin());

-- Insert default templates
INSERT INTO public.whatsapp_templates (template_type, template_content) VALUES
('agendamento_cliente', '🩺 *Agendamento Confirmado*\n\nOlá {clientName}!\n\nSeu agendamento foi confirmado:\n\n📅 Data: {appointmentDate}\n⏰ Horário: {appointmentTime}\n💉 Procedimento: {procedureName}\n{notes}\n📍 Local: Av. Brasil, 63b, São Francisco - Tefé-AM\n🗺️ Ver localização: https://share.google/GBkRNRdCejpJYVANt\n\nObrigado pela confiança! 🙏'),
('agendamento_atualizado_cliente', '🩺 *Agendamento Atualizado*\n\nOlá {clientName}!\n\nSeu agendamento foi atualizado:\n\n📅 Data: {appointmentDate}\n⏰ Horário: {appointmentTime}\n💉 Procedimento: {procedureName}\n{notes}\n📍 Local: Av. Brasil, 63b, São Francisco - Tefé-AM\n🗺️ Ver localização: https://share.google/GBkRNRdCejpJYVANt\n\nObrigado pela confiança! 🙏'),
('agendamento_proprietaria', '📅 *NOVO AGENDAMENTO*\n\n👤 Cliente: {clientName}\n📱 Telefone: {clientPhone}\n📅 Data: {appointmentDate}\n⏰ Horário: {appointmentTime}\n💉 Procedimento: {procedureName}\n{notes}\n📍 Clínica Dra. Karoline Ferreira\nTefé-AM'),
('alteracao_proprietaria', '📝 *AGENDAMENTO ALTERADO*\n\n👤 Cliente: {clientName}\n📱 Telefone: {clientPhone}\n📅 Data: {appointmentDate}\n⏰ Horário: {appointmentTime}\n💉 Procedimento: {procedureName}\n{notes}\n📍 Clínica Dra. Karoline Ferreira\nTefé-AM'),
('cancelamento_proprietaria', '❌ *AGENDAMENTO CANCELADO*\n\n👤 Cliente: {clientName}\n📱 Telefone: {clientPhone}\n📅 Data: {appointmentDate}\n⏰ Horário: {appointmentTime}\n💉 Procedimento: {procedureName}\n{notes}\n📍 Clínica Dra. Karoline Ferreira\nTefé-AM');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();