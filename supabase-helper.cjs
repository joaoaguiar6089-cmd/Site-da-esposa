// VS Code Supabase Integration Helper
// This allows the AI agent (GitHub Copilot) to make changes directly to your Supabase project

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ VITE_SUPABASE_URL não encontrada no .env');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('⚠️  SUPABASE_SERVICE_ROLE_KEY não encontrada no .env');
  console.log('\n📝 Para habilitar integração completa, adicione no .env:');
  console.log('SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"');
  console.log('\n🔑 Encontre sua service role key em:');
  console.log('https://supabase.com/dashboard/project/ejqsaloqrczyfiqljcym/settings/api');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Helper functions
async function executeSql(sql) {
  console.log('🔄 Executando SQL...\n');
  console.log(sql.substring(0, 200) + (sql.length > 200 ? '...' : ''));
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  }
  
  console.log('✅ SQL executado com sucesso!');
  return data;
}

async function applyMigration(migrationFile) {
  const fullPath = path.join(__dirname, 'supabase', 'migrations', migrationFile);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Migration não encontrada: ${migrationFile}`);
  }
  
  const sql = fs.readFileSync(fullPath, 'utf8');
  console.log(`📄 Aplicando migration: ${migrationFile}`);
  
  return await executeSql(sql);
}

async function createTable(tableName, columns) {
  const colDefs = columns.map(col => {
    let def = `"${col.name}" ${col.type}`;
    if (col.primaryKey) def += ' primary key';
    if (col.default) def += ` default ${col.default}`;
    if (col.notNull) def += ' not null';
    return def;
  }).join(', ');
  
  const sql = `create table if not exists public."${tableName}" (${colDefs});`;
  return await executeSql(sql);
}

async function alterTable(tableName, addColumns = [], dropColumns = []) {
  const statements = [];
  
  for (const col of addColumns) {
    let def = `add column if not exists "${col.name}" ${col.type}`;
    if (col.default) def += ` default ${col.default}`;
    if (col.notNull) def += ' not null';
    statements.push(`alter table public."${tableName}" ${def};`);
  }
  
  for (const colName of dropColumns) {
    statements.push(`alter table public."${tableName}" drop column if exists "${colName}";`);
  }
  
  if (statements.length === 0) {
    throw new Error('Nenhuma alteração especificada');
  }
  
  return await executeSql(statements.join('\n'));
}

async function createBucket(bucketName, isPublic = false) {
  console.log(`🪣 Criando bucket: ${bucketName} (${isPublic ? 'público' : 'privado'})`);
  
  const { data, error } = await supabase.storage.createBucket(bucketName, {
    public: isPublic,
  });
  
  if (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  }
  
  console.log('✅ Bucket criado com sucesso!');
  return data;
}

async function uploadFile(bucketName, filePath, localFilePath) {
  console.log(`📤 Upload: ${localFilePath} → ${bucketName}/${filePath}`);
  
  const fileBuffer = fs.readFileSync(localFilePath);
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, fileBuffer, {
      contentType: getMimeType(localFilePath),
      upsert: true,
    });
  
  if (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  }
  
  console.log('✅ Arquivo enviado com sucesso!');
  return data;
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
  };
  return types[ext] || 'application/octet-stream';
}

// CLI interface
const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  try {
    switch (command) {
      case 'apply-migration':
        if (args.length === 0) {
          console.error('❌ Uso: node supabase-helper.cjs apply-migration <arquivo.sql>');
          process.exit(1);
        }
        await applyMigration(args[0]);
        break;
        
      case 'exec-sql':
        if (args.length === 0) {
          console.error('❌ Uso: node supabase-helper.cjs exec-sql "<SQL>"');
          process.exit(1);
        }
        await executeSql(args.join(' '));
        break;
        
      case 'create-table':
        if (args.length < 2) {
          console.error('❌ Uso: node supabase-helper.cjs create-table <nome> <colunas-json>');
          process.exit(1);
        }
        await createTable(args[0], JSON.parse(args[1]));
        break;
        
      case 'create-bucket':
        if (args.length === 0) {
          console.error('❌ Uso: node supabase-helper.cjs create-bucket <nome> [public]');
          process.exit(1);
        }
        await createBucket(args[0], args[1] === 'public');
        break;
        
      case 'upload':
        if (args.length < 3) {
          console.error('❌ Uso: node supabase-helper.cjs upload <bucket> <path> <arquivo-local>');
          process.exit(1);
        }
        await uploadFile(args[0], args[1], args[2]);
        break;
        
      case 'test':
        console.log('🧪 Testando conexão com Supabase...');
        const { data, error } = await supabase.from('clients').select('count').limit(1);
        if (error) throw error;
        console.log('✅ Conexão OK!');
        break;
        
      default:
        console.log(`
🤖 VS Code Supabase Integration Helper

Comandos disponíveis:

  test
    Testa a conexão com o Supabase

  apply-migration <arquivo.sql>
    Aplica uma migration específica

  exec-sql "<SQL>"
    Executa SQL arbitrário

  create-table <nome> '<json>'
    Cria uma tabela. Exemplo:
    create-table users '[{"name":"id","type":"uuid","primaryKey":true}]'

  create-bucket <nome> [public]
    Cria um storage bucket

  upload <bucket> <path> <arquivo-local>
    Faz upload de um arquivo

Exemplos:
  node supabase-helper.cjs test
  node supabase-helper.cjs apply-migration 20251009120000_create_ai_agent_logs.sql
  node supabase-helper.cjs create-bucket ai-uploads public
  node supabase-helper.cjs exec-sql "select * from clients limit 1"
`);
    }
  } catch (error) {
    console.error('\n💥 Erro:', error.message);
    process.exit(1);
  }
}

main();

module.exports = { executeSql, applyMigration, createTable, alterTable, createBucket, uploadFile };
