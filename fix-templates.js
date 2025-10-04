// Script para corrigir templates hardcoded
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ejqsaloqrczyfiqljcym.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXNhbG9xcmN6eWZpcWxqY3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDQ0MjUsImV4cCI6MjA2OTkyMDQyNX0.kefVEuV7Yu7vWLbfoAjBer57dwu34h4uTlw6IKU5mcA";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function fixTemplates() {
  try {
    console.log('🔧 Corrigindo templates com endereços hardcoded...\n');
    
    // Template 1: alteracao_proprietaria
    const newAlteracaoContent = `📝 *AGENDAMENTO ALTERADO*

👤 Cliente: {clientName}
📱 Telefone: {clientPhone}
📅 Data: {appointmentDate}
⏰ Horário: {appointmentTime}
💉 Procedimento: {procedureName}
{notes}

{clinicLocation}`;

    console.log('📝 Atualizando template "alteracao_proprietaria"...');
    console.log('Novo conteúdo:', newAlteracaoContent);

    // Template 2: cancelamento_proprietaria
    const newCancelamentoProprietariaContent = `❌ *AGENDAMENTO CANCELADO*

👤 Cliente: {clientName}
📱 Telefone: {clientPhone}
📅 Data: {appointmentDate}
⏰ Horário: {appointmentTime}
💉 Procedimento: {procedureName}
{notes}

{clinicLocation}`;

    console.log('\n📝 Atualizando template "cancelamento_proprietaria"...');
    console.log('Novo conteúdo:', newCancelamentoProprietariaContent);

    // Template 3: cancelamento_cliente
    const newCancelamentoClienteContent = `❌ *Agendamento Cancelado*

Olá {clientName}!

Informamos que seu agendamento foi cancelado:

📅 Data: {appointmentDate}
⏰ Horário: {appointmentTime}
💉 Procedimento: {procedureName}

📞 Se quiser reagendar, entre em contato conosco.

{clinicLocation}`;

    console.log('\n📝 Atualizando template "cancelamento_cliente"...');
    console.log('Novo conteúdo:', newCancelamentoClienteContent);

    // Simular as atualizações (comentado por segurança)
    console.log('\n⚠️ SIMULAÇÃO - Para aplicar as mudanças, descomente as linhas de update abaixo');
    
    /*
    const { error: error1 } = await supabase
      .from('whatsapp_templates')
      .update({ template_content: newAlteracaoContent })
      .eq('template_type', 'alteracao_proprietaria');

    const { error: error2 } = await supabase
      .from('whatsapp_templates')
      .update({ template_content: newCancelamentoProprietariaContent })
      .eq('template_type', 'cancelamento_proprietaria');

    const { error: error3 } = await supabase
      .from('whatsapp_templates')
      .update({ template_content: newCancelamentoClienteContent })
      .eq('template_type', 'cancelamento_cliente');

    if (error1 || error2 || error3) {
      console.error('Erros:', { error1, error2, error3 });
    } else {
      console.log('✅ Templates atualizados com sucesso!');
    }
    */
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

fixTemplates();