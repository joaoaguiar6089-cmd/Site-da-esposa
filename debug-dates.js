// Debug detalhado da comparação de datas
import { parseISO } from 'date-fns';

function debugDateComparison() {
  const period = {
    date_start: '2025-09-30',
    date_end: '2025-10-18'
  };
  
  const testDate = new Date('2025-09-30');
  
  console.log('🔍 Debug detalhado:');
  console.log('Period start string:', period.date_start);
  console.log('Period end string:', period.date_end);
  
  const start = parseISO(period.date_start);
  const end = parseISO(period.date_end);
  
  console.log('Parsed start:', start);
  console.log('Parsed end:', end);
  console.log('Test date:', testDate);
  
  const dateOnly = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate());
  const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  
  console.log('Date only:', dateOnly);
  console.log('Start only:', startOnly);
  console.log('End only:', endOnly);
  
  console.log('dateOnly >= startOnly:', dateOnly >= startOnly);
  console.log('dateOnly <= endOnly:', dateOnly <= endOnly);
  console.log('Result:', dateOnly >= startOnly && dateOnly <= endOnly);
  
  // Testar timezone
  console.log('\n⏰ Timezone info:');
  console.log('Test date timezone offset:', testDate.getTimezoneOffset());
  console.log('Start timezone offset:', start.getTimezoneOffset());
}

debugDateComparison();