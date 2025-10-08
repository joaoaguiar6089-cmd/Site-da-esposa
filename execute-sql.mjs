import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = "https://ejqsaloqrczyfiqljcym.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXNhbG9xcmN6eWZpcWxqY3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDQ0MjUsImV4cCI6MjA2OTkyMDQyNX0.kefVEuV7Yu7vWLbfoAjBer57dwu34h4uTlw6IKU5mcA";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🔧 Configurando Storage do Supabase...\n');

// Ler o SQL
const sql = readFileSync('setup-bucket.sql', 'utf8');

// Dividir em comandos individuais
const commands = sql
  .split(';')
  .map(cmd => cmd.trim())
  .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

for (const command of commands) {
  if (command.includes('SELECT') && command.includes('status')) {
    // Pular o SELECT de verificação final
    continue;
  }
  
  console.log(`Executando: ${command.substring(0, 60)}...`);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: command + ';'
    });
    
    if (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('  ℹ️  Já existe (OK)\n');
      } else {
        console.log(`  ⚠️  ${error.message}\n`);
      }
    } else {
      console.log('  ✅ Sucesso\n');
    }
  } catch (err) {
    console.log(`  ⚠️  ${err.message}\n`);
  }
}

// Verificar resultado
console.log('3️⃣ Verificando configuração...');
const { data: buckets } = await supabase.storage.listBuckets();
const bucket = buckets?.find(b => b.name === 'client-documents');

if (bucket) {
  console.log('✅ Bucket "client-documents" configurado!');
  console.log(`   - Público: ${bucket.public}`);
  console.log(`   - Limite: ${bucket.file_size_limit / 1024 / 1024} MB\n`);
} else {
  console.log('❌ Bucket não encontrado\n');
}

// Testar upload
console.log('4️⃣ Testando upload...');
const testFile = new Blob(['test'], { type: 'text/plain' });
const testFileName = `test/test-${Date.now()}.txt`;

const { error: uploadError } = await supabase.storage
  .from('client-documents')
  .upload(testFileName, testFile);

if (uploadError) {
  console.log(`❌ Erro: ${uploadError.message}`);
} else {
  console.log('✅ Upload funcionando!');
  
  // Limpar
  await supabase.storage.from('client-documents').remove([testFileName]);
  console.log('✅ Teste concluído\n');
}

console.log('🎉 Configuração finalizada!');
console.log('\nAgora você pode:');
console.log('1. Acessar a área administrativa');
console.log('2. Ir em Controle de Estoque → Extrato');
console.log('3. Criar uma nova entrada com anexo');
console.log('4. Clicar no ícone 📄 para visualizar');
