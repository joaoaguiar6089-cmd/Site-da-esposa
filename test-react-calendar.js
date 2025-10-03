// Simular exatamente como o React Calendar funciona
import { format } from 'date-fns';

function isDateInPeriod(date, period) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const startStr = period.date_start;
  const endStr = period.date_end || period.date_start;
  
  return dateStr >= startStr && dateStr <= endStr;
}

// Dados reais do debug anterior
const availabilityPeriods = [
  {
    id: 1,
    city_id: 'a7b80c05-7cc4-44a3-adb7-e0c9f07ea904',
    city_name: 'Manaus',
    date_start: '2025-09-30',
    date_end: '2025-10-03',
    color: 'bg-blue-500'
  },
  {
    id: 2,
    city_id: '41f48688-b19b-4b7a-ad85-7e1b14a5db1d',
    city_name: 'Tefé',
    date_start: '2025-09-30',
    date_end: '2025-10-18',
    color: 'bg-green-500'
  }
];

// Simular as datas que o calendário React gera
console.log('📅 Simulando React Calendar para outubro 2025:');

// O React Calendar gera datas assim:
for (let day = 1; day <= 31; day++) {
  const date = new Date(2025, 9, day); // outubro = mês 9 (0-indexed)
  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Verificar em qual período esta data se encaixa
  const matchingPeriods = availabilityPeriods.filter(period => isDateInPeriod(date, period));
  
  if (matchingPeriods.length > 0) {
    console.log(`  ${dateStr}: ${matchingPeriods.map(p => `${p.city_name} (${p.color})`).join(', ')}`);
  }
}

// Testar especificamente o dia 3 de outubro
const oct3 = new Date(2025, 9, 3);
console.log('\n🎯 Teste específico para 03/10/2025:');
console.log('Data:', oct3);
console.log('Formatted:', format(oct3, 'yyyy-MM-dd'));

availabilityPeriods.forEach(period => {
  const result = isDateInPeriod(oct3, period);
  console.log(`  ${period.city_name}: ${result ? '✅ MATCH' : '❌ NO MATCH'} (${period.date_start} até ${period.date_end})`);
});