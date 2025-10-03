// Script para debugar o problema das cores
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ejqsaloqrczyfiqljcym.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXNhbG9xcmN6eWZpcWxqY3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDQ0MjUsImV4cCI6MjA2OTkyMDQyNX0.kefVEuV7Yu7vWLbfoAjBer57dwu34h4uTlw6IKU5mcA";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const CITY_COLORS = [
  'bg-blue-500',
  'bg-green-500', 
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-red-500'
];

async function debugCalendar() {
  try {
    console.log('🔍 Debugando calendário...\n');
    
    // 1. Verificar cidades
    const { data: cities, error: citiesError } = await supabase
      .from('city_settings')
      .select('id, city_name')
      .order('city_name');
      
    if (citiesError) throw citiesError;
    console.log('🏙️ Cidades encontradas:');
    cities?.forEach((city, index) => {
      console.log(`  ${index}: ${city.city_name} (ID: ${city.id}) - Cor: ${CITY_COLORS[index % CITY_COLORS.length]}`);
    });
    
    // 2. Verificar períodos de disponibilidade
    const { data: periods, error: periodsError } = await supabase
      .from('city_availability')
      .select(`
        *,
        city_settings!inner(city_name)
      `)
      .order('date_start');
      
    if (periodsError) throw periodsError;
    console.log('\n📅 Períodos de disponibilidade:');
    periods?.forEach((period, index) => {
      const cityIndex = cities?.findIndex(c => c.id === period.city_id) || 0;
      const color = CITY_COLORS[cityIndex % CITY_COLORS.length];
      console.log(`  ${period.city_settings?.city_name}: ${period.date_start} até ${period.date_end}`);
      console.log(`    City ID: ${period.city_id}, Índice: ${cityIndex}, Cor: ${color}`);
      console.log(`    Horário: ${period.start_time || 'N/A'} às ${period.end_time || 'N/A'}\n`);
    });
    
    // 3. Simular data específica
    const tefeDate = new Date('2025-10-05'); // 5 de outubro
    console.log('🎯 Testando data 05/10/2025 (deve estar em Tefé):');
    periods?.forEach(period => {
      const start = new Date(period.date_start);
      const end = new Date(period.date_end);
      const isInPeriod = tefeDate >= start && tefeDate <= end;
      console.log(`  ${period.city_settings?.city_name}: ${isInPeriod ? '✅ SIM' : '❌ NÃO'} (${period.date_start} até ${period.date_end})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

debugCalendar();