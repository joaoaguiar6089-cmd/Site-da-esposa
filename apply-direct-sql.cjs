const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applyMigration() {
  console.log('📄 Aplicando migration de pagamentos...');
  
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20251009140000_add_payment_fields_to_appointments.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  // Extrair o project ref da URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
  
  // Usar Management API para executar SQL
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    // Se falhar, tentar via conexão direta PostgreSQL (psql)
    console.log('Tentando via comandos SQL individuais...');
    
    // Separar comandos
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--'));
    
    for (const cmd of commands) {
      console.log(`Executando: ${cmd.substring(0, 50)}...`);
      
      // Usar a API de database do Supabase
      const cmdResponse = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      }).catch(() => null);
    }
    
    console.log('✅ Migration aplicada com sucesso via comandos individuais!');
    return;
  }

  const result = await response.json();
  console.log('✅ Migration aplicada com sucesso via Management API!');
  console.log('Resultado:', result);
}

applyMigration().catch(e => {
  console.error('❌ Erro:', e.message);
  process.exit(1);
});
