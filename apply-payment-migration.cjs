const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      schema: 'public'
    }
  }
);

async function applyMigration() {
  console.log('📄 Aplicando migration de pagamentos...');
  
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20251009140000_add_payment_fields_to_appointments.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  // Executar via API REST diretamente
  const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ sql_query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro HTTP ${response.status}: ${error}`);
  }

  const result = await response.json();
  console.log('✅ Migration aplicada com sucesso!');
  console.log('Resultado:', result);
}

applyMigration().catch(e => {
  console.error('❌ Erro:', e.message);
  process.exit(1);
});
