-- Corrigir template para remover duplo emoji e usar variável correta
UPDATE whatsapp_templates 
SET template_content = 'Olá {clientName}! 👋  

✅ Seu agendamento foi confirmado!  

📅 Data: {appointmentDate}  
⏰ Horário: {appointmentTime}  
💆 Procedimento: {procedureName}

📍 Clínica Dra. Karoline Ferreira — Tefé
🗺️ {clinicMapUrl}

✨ Aguardo você!

* Se precisar cancelar ou alterar, entre em contato conosco ou faça pelo nosso site: drakarolineferreira.com.br - área do cliente.'
WHERE template_type = 'agendamento_cliente';

-- Verificar a correção
SELECT template_content FROM whatsapp_templates WHERE template_type = 'agendamento_cliente';