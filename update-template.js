import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ebrqhfccwmabacplulma.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicnFoZmNjd21hYmFjcGx1bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU1NDMyMjUsImV4cCI6MjA0MTExOTIyNX0.QXYEzJ9F8pCVzWJBVJN5VZQT5GaDNdZUqUaWqQ3hdMU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTemplate() {
  try {
    console.log('Atualizando template de agendamento...');
    
    // Novo template que usa as variáveis corretas em português
    const newTemplate = `Olá {nomeCliente}! 👋  

✅ Seu agendamento foi confirmado!  

📅 Data: {dataAgendamento}  
⏰ Horário: {horarioAgendamento}  
� Procedimento: {nomeProcedimento}

📍 {localizacaoClinica}

✨ Aguardo você!

* Se precisar cancelar ou alterar, entre em contato conosco ou faça pelo nosso site: drakarolineferreira.com.br - área do cliente.`;

    const { data, error } = await supabase
      .from('whatsapp_templates')
      .update({ template_content: newTemplate })
      .eq('template_type', 'agendamento_cliente')
      .select();

    if (error) {
      console.error('Erro ao atualizar template:', error);
      return;
    }

    console.log('Template atualizado com sucesso:', data);
    
    // Verificar se foi atualizado
    const { data: templateCheck } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('template_type', 'agendamento_cliente')
      .single();
      
    console.log('Template verificado:', templateCheck);
    
  } catch (err) {
    console.error('Erro:', err);
  }
}

updateTemplate();