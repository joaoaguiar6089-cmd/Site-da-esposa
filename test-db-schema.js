// Script temporário para testar o schema do banco
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ejqsaloqrczyfiqljcym.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXNhbG9xcmN6eWZpcWxqY3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDQ0MjUsImV4cCI6MjA2OTkyMDQyNX0.kefVEuV7Yu7vWLbfoAjBer57dwu34h4uTlw6IKU5mcA";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function testSchema() {
  try {
    // Tenta fazer uma consulta simples para ver se os campos existem
    const { data, error } = await supabase
      .from('city_availability')
      .select('id, city_id, date_start, date_end, start_time, end_time')
      .limit(1);
      
    if (error) {
      console.log('Erro:', error.message);
      console.log('Os campos start_time e end_time provavelmente não existem ainda.');
    } else {
      console.log('Schema OK! Campos existem:', data);
    }
  } catch (err) {
    console.log('Erro de conexão:', err.message);
  }
}

testSchema();