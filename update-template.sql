-- Atualizar template de agendamento com variáveis em português
UPDATE whatsapp_templates 
SET template_content = 'Olá {nomeCliente}! 👋  

✅ Seu agendamento foi confirmado!  

📅 Data: {dataAgendamento}  
⏰ Horário: {horarioAgendamento}  
💆 Procedimento: {nomeProcedimento}

📍 {localizacaoClinica}

✨ Aguardo você!

* Se precisar cancelar ou alterar, entre em contato conosco ou faça pelo nosso site: drakarolineferreira.com.br - área do cliente.'
WHERE template_type = 'agendamento_cliente';

-- Verificar se foi atualizado
SELECT template_type, template_content FROM whatsapp_templates WHERE template_type = 'agendamento_cliente';