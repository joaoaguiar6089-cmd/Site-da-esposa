// Script para verificar templates e suas variáveis
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ejqsaloqrczyfiqljcym.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXNhbG9xcmN6eWZpcWxqY3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDQ0MjUsImV4cCI6MjA2OTkyMDQyNX0.kefVEuV7Yu7vWLbfoAjBer57dwu34h4uTlw6IKU5mcA";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function checkTemplates() {
  try {
    console.log('🔍 Verificando templates de WhatsApp...\n');
    
    const { data: templates, error } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .order('template_type');
      
    if (error) throw error;
    
    console.log('📋 Templates encontrados:');
    templates?.forEach(template => {
      console.log(`\n📝 ${template.template_type}:`);
      console.log(`Conteúdo: ${template.template_content}`);
      
      // Verificar variáveis usadas
      const variables = template.template_content.match(/\{([^}]+)\}/g) || [];
      console.log(`Variáveis: ${variables.join(', ')}`);
      
      // Verificar se usa cliniclocation (incorreto)
      if (template.template_content.includes('{cliniclocation}')) {
        console.log('⚠️  PROBLEMA: Usa {cliniclocation} em vez de {clinicLocation}');
      }
      
      // Verificar se usa clinicLocation (correto)
      if (template.template_content.includes('{clinicLocation}')) {
        console.log('✅ OK: Usa {clinicLocation} correto');
      }
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkTemplates();