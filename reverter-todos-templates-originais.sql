-- Reverter TODOS os templates para como estavam antes das alterações
-- Execute este arquivo no PostgreSQL Explorer

-- 1. Template de confirmação (agendamento_cliente) - reverter ao original
UPDATE whatsapp_templates 
SET template_content = 'Olá {clientName}! 👋  

✅ Seu agendamento foi confirmado!  

📅 Data: {appointmentDate}  
⏰ Horário: {appointmentTime}  
💆 Procedimento: {procedureName}

📍 {clinicLocation}

✨ Aguardo você!

* Se precisar cancelar ou alterar, entre em contato conosco ou faça pelo nosso site: drakarolineferreira.com.br - área do cliente.'
WHERE template_type = 'agendamento_cliente';

-- 2. Template de atualização (agendamento_atualizado_cliente) - reverter ao original
UPDATE whatsapp_templates 
SET template_content = 'Olá {clientName}! 👋  

📝 Seu agendamento foi atualizado!  

📅 Data: {appointmentDate}  
⏰ Horário: {appointmentTime}  
💆 Procedimento: {procedureName}

📍 {clinicLocation}

✨ Aguardo você!

* Se precisar cancelar ou alterar, entre em contato conosco ou faça pelo nosso site: drakarolineferreira.com.br - área do cliente.'
WHERE template_type = 'agendamento_atualizado_cliente';

-- 3. Template para proprietária - novo agendamento
UPDATE whatsapp_templates 
SET template_content = '📅 *NOVO AGENDAMENTO*

👤 Cliente: {clientName}
📱 Telefone: {clientPhone}
📅 Data: {appointmentDate}
⏰ Horário: {appointmentTime}
💉 Procedimento: {procedureName}
{notes}
📍 {clinicLocation}'
WHERE template_type = 'agendamento_proprietaria';

-- 4. Template para proprietária - alteração
UPDATE whatsapp_templates 
SET template_content = '📝 *AGENDAMENTO ALTERADO*

👤 Cliente: {clientName}
📱 Telefone: {clientPhone}
📅 Data: {appointmentDate}
⏰ Horário: {appointmentTime}
💉 Procedimento: {procedureName}
{notes}
📍 {clinicLocation}'
WHERE template_type = 'alteracao_proprietaria';

-- 5. Template para proprietária - cancelamento
UPDATE whatsapp_templates 
SET template_content = '❌ *AGENDAMENTO CANCELADO*

👤 Cliente: {clientName}
📱 Telefone: {clientPhone}
📅 Data: {appointmentDate}
⏰ Horário: {appointmentTime}
💉 Procedimento: {procedureName}
{notes}
📍 {clinicLocation}'
WHERE template_type = 'cancelamento_proprietaria';

-- 6. Template de cancelamento para cliente
UPDATE whatsapp_templates 
SET template_content = 'Olá {clientName}! 👋  

❌ Seu agendamento foi cancelado!  

📅 Data: {appointmentDate}  
⏰ Horário: {appointmentTime}  
💆 Procedimento: {procedureName}

📍 {clinicLocation}

* Se precisar reagendar, entre em contato conosco ou faça pelo nosso site: drakarolineferreira.com.br - área do cliente.'
WHERE template_type = 'cancelamento_cliente';

-- Verificar todos os templates revertidos
SELECT 'Templates revertidos para o estado original:' AS info;
SELECT template_type, LEFT(template_content, 150) AS preview
FROM whatsapp_templates 
ORDER BY template_type;