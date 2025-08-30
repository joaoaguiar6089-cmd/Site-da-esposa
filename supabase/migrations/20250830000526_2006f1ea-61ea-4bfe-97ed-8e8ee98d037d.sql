-- Adicionar template de confirmação de agendamento
INSERT INTO whatsapp_templates (template_type, template_content)
VALUES (
  'appointment_confirmation',
  'Olá {cliente_nome}! 🎉

Seu agendamento foi confirmado com sucesso! 

📅 *Data:* {data}
🕐 *Horário:* {horario}
💄 *Procedimento:* {procedimento}
👩‍⚕️ *Profissional:* {profissional}

📍 *Local:* Clínica Dra. Karoline

Estamos ansiosos para atendê-lo(a)! Em caso de dúvidas, entre em contato conosco.

_Mensagem automática - Não responda._'
);