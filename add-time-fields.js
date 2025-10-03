// Script para adicionar campos de horário via SQL
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ejqsaloqrczyfiqljcym.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXNhbG9xcmN6eWZpcWxqY3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDQ0MjUsImV4cCI6MjA2OTkyMDQyNX0.kefVEuV7Yu7vWLbfoAjBer57dwu34h4uTlw6IKU5mcA";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function addTimeFields() {
  try {
    console.log('Tentando adicionar campos de horário...');
    
    // Nota: O cliente JavaScript não tem permissões para ALTER TABLE
    // Mas vamos tentar via RPC se houver alguma função disponível
    const { data, error } = await supabase.rpc('version');
    
    if (error) {
      console.log('Erro de permissão:', error.message);
      console.log('Você precisa aplicar esta migração via dashboard do Supabase:');
      console.log('\nSQL para executar no SQL Editor do dashboard:');
      console.log('ALTER TABLE city_availability ADD COLUMN start_time TIME DEFAULT \'09:00:00\'::time;');
      console.log('ALTER TABLE city_availability ADD COLUMN end_time TIME DEFAULT \'18:00:00\'::time;');
    } else {
      console.log('Conectado ao banco:', data);
    }
  } catch (err) {
    console.log('Erro:', err.message);
  }
}

addTimeFields();