-- Buscar os templates atuais corretos que estavam funcionando
-- Execute este arquivo no PostgreSQL Explorer

-- Ver todos os templates atuais
SELECT 'Templates atuais no banco:' AS info;
SELECT template_type, template_content 
FROM whatsapp_templates 
ORDER BY template_type;