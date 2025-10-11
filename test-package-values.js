import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wppdhihnykpxjctwhsla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwcGRoaWhueWtweGpjdHdoc2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MTY3NTMsImV4cCI6MjA0ODk5Mjc1M30.5WkI0eElE_KuvQk89NqBWYNY_sQPGCp4vgCpnYLTJ3w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPackageValues() {
  console.log('🔍 Testando valores de pacotes...\n');

  // Buscar agendamentos de epilação pacote 1
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      appointment_date,
      session_number,
      total_sessions,
      payment_value,
      procedures!appointments_procedure_id_fkey(name, price, sessions)
    `)
    .ilike('procedures.name', '%epilação%pacote%')
    .order('appointment_date', { ascending: true });

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  console.log(`📦 Encontrados ${appointments.length} agendamentos:\n`);

  appointments.forEach((apt, index) => {
    const isFirstSession = !apt.session_number || apt.session_number === 1;
    const sessionInfo = apt.total_sessions 
      ? `Sessão ${apt.session_number || 1}/${apt.total_sessions}`
      : 'Sessão única';
    
    console.log(`${index + 1}. ${apt.procedures.name}`);
    console.log(`   Data: ${apt.appointment_date}`);
    console.log(`   ${sessionInfo}`);
    console.log(`   Valor do procedimento: R$ ${apt.procedures.price}`);
    console.log(`   Valor de pagamento: R$ ${apt.payment_value || 0}`);
    console.log(`   É primeira sessão? ${isFirstSession ? 'SIM' : 'NÃO'}`);
    console.log(`   Valor planejado deveria ser: R$ ${isFirstSession ? apt.procedures.price : 0}`);
    console.log('');
  });

  console.log('\n✅ Teste concluído!');
}

testPackageValues();
