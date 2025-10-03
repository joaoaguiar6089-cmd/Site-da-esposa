// Teste específico para a função isDateInPeriod
import { parseISO, isWithinInterval, isSameDay } from 'date-fns';

function isDateInPeriod(date, period) {
  const start = parseISO(period.date_start);
  const end = period.date_end ? parseISO(period.date_end) : start;
  
  // Comparar apenas as datas, ignorando horário
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  
  return dateOnly >= startOnly && dateOnly <= endOnly;
}

// Período de Tefé: 2025-09-30 até 2025-10-18
const tefePeriod = {
  date_start: '2025-09-30',
  date_end: '2025-10-18'
};

// Testar várias datas
const testDates = [
  '2025-09-29', // Antes do período
  '2025-09-30', // Início do período
  '2025-10-01', // Meio do período
  '2025-10-05', // Meio do período
  '2025-10-18', // Fim do período
  '2025-10-19'  // Depois do período
];

console.log('🧪 Testando função isDateInPeriod para Tefé (30/09 até 18/10):');
testDates.forEach(dateStr => {
  const date = new Date(dateStr);
  const result = isDateInPeriod(date, tefePeriod);
  console.log(`  ${dateStr}: ${result ? '✅ DENTRO' : '❌ FORA'}`);
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
  console.log(`  ${dateStr}: ${result ? '✅ DENTRO' : '❌ FORA'}`);
});