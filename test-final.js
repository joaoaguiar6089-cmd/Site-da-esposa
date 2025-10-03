// Teste final da função isDateInPeriod corrigida
import { format } from 'date-fns';

function isDateInPeriod(date, period) {
  // Converter para strings de data para comparação mais confiável
  const dateStr = format(date, 'yyyy-MM-dd');
  const startStr = period.date_start;
  const endStr = period.date_end || period.date_start;
  
  return dateStr >= startStr && dateStr <= endStr;
}

// Período de Tefé: 2025-09-30 até 2025-10-18
const tefePeriod = {
  date_start: '2025-09-30',
  date_end: '2025-10-18'
};

// Testar várias datas
const testDates = [
  '2025-09-29', // Antes do período
  '2025-09-30', // Início do período ✅
  '2025-10-01', // Meio do período ✅
  '2025-10-05', // Meio do período ✅
  '2025-10-18', // Fim do período ✅
  '2025-10-19'  // Depois do período
];

console.log('🧪 Teste FINAL - função isDateInPeriod para Tefé (30/09 até 18/10):');
testDates.forEach(dateStr => {
  const date = new Date(dateStr);
  const result = isDateInPeriod(date, tefePeriod);
  const formatted = format(date, 'yyyy-MM-dd');
  console.log(`  ${dateStr} (${formatted}): ${result ? '✅ DENTRO' : '❌ FORA'}`);
});

// Testar período com date_end null
const periodoNull = {
  date_start: '2025-10-04',
  date_end: null
};

console.log('\n🧪 Testando período com date_end null (04/10):');
testDates.forEach(dateStr => {
  const date = new Date(dateStr);
  const result = isDateInPeriod(date, periodoNull);
  const formatted = format(date, 'yyyy-MM-dd');
  console.log(`  ${dateStr} (${formatted}): ${result ? '✅ DENTRO' : '❌ FORA'}`);
});