import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wppdhihnykpxjctwhsla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwcGRoaWhueWtweGpjdHdoc2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MTY3NTMsImV4cCI6MjA0ODk5Mjc1M30.5WkI0eElE_KuvQk89NqBWYNY_sQPGCp4vgCpnYLTJ3w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSessionData() {
  console.log('🔍 Verificando dados de sessão nos agendamentos...\n');

  // Buscar agendamentos de epilação
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      appointment_date,
      appointment_time,
      session_number,
      total_sessions,
      procedures!appointments_procedure_id_fkey(name, sessions),
      clients(nome, sobrenome)
    `)
    .ilike('procedures.name', '%epilação%')
    .order('appointment_date', { ascending: true });

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  console.log(`📦 Encontrados ${appointments.length} agendamentos:\n`);

  appointments.forEach((apt, index) => {
    console.log(`${index + 1}. ID: ${apt.id.substring(0, 8)}...`);
    console.log(`   Cliente: ${apt.clients.nome} ${apt.clients.sobrenome}`);
    console.log(`   Procedimento: ${apt.procedures.name}`);
    console.log(`   Data: ${apt.appointment_date} às ${apt.appointment_time}`);
    console.log(`   session_number: ${apt.session_number || 'NULL'}`);
    console.log(`   total_sessions: ${apt.total_sessions || 'NULL'}`);
    console.log(`   procedures.sessions: ${apt.procedures.sessions || 'NULL'}`);
    console.log('');
  });

  console.log('✅ Verificação concluída!');
}

checkSessionData();
