-- Inserir template de cancelamento para clientes
INSERT INTO public.whatsapp_templates (template_type, template_content, created_at, updated_at)
VALUES (
  'cancelamento_cliente',
  '❌ *Agendamento Cancelado*

Olá {clientName}!

Informamos que seu agendamento foi cancelado:

📅 Data: {appointmentDate}
⏰ Horário: {appointmentTime}
💉 Procedimento: {procedureName}

📞 Para reagendar, entre em contato conosco.

🏥 Clínica Dra. Karoline Ferreira
Tefé-AM',
  NOW(),
  NOW()
) ON CONFLICT (template_type) DO UPDATE SET
  template_content = EXCLUDED.template_content,
  updated_at = NOW();