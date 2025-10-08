// Execute este script no console do navegador na área administrativa
// Ou use o SQL Editor do Supabase diretamente

const SUPABASE_URL = "https://ejqsaloqrczyfiqljcym.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXNhbG9xcmN6eWZpcWxqY3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDQ0MjUsImV4cCI6MjA2OTkyMDQyNX0.kefVEuV7Yu7vWLbfoAjBer57dwu34h4uTlw6IKU5mcA";

console.log('Para configurar o bucket, execute os seguintes SQLs no Supabase:');
console.log('https://supabase.com/dashboard/project/ejqsaloqrczyfiqljcym/sql\n');

const sqls = `

async function setupStorage() {
  console.log('🔧 Configurando Storage do Supabase...\n');

  try {
    // 1. Verificar buckets existentes
    console.log('1️⃣ Verificando buckets existentes...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError);
      return;
    }

    const existingBucket = buckets?.find(b => b.name === 'client-documents');
    
    if (existingBucket) {
      console.log('✅ Bucket "client-documents" já existe!\n');
    } else {
      console.log('📦 Bucket "client-documents" não encontrado. Criando...');
      
      // 2. Criar bucket
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('client-documents', {
        public: true,
        fileSizeLimit: 10485760, // 10 MB
        allowedMimeTypes: [
          'application/pdf',
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/webp',
          'image/gif'
        ]
      });

      if (createError) {
        console.error('❌ Erro ao criar bucket:', createError);
        return;
      }
      
      console.log('✅ Bucket criado com sucesso!\n');
    }

    // 3. Configurar políticas RLS via SQL
    console.log('2️⃣ Configurando políticas de acesso (RLS)...');
    
    const policies = [
      {
        name: 'Authenticated users can upload files',
        sql: `
          CREATE POLICY IF NOT EXISTS "Authenticated users can upload files"
          ON storage.objects
          FOR INSERT
          TO authenticated
          WITH CHECK (bucket_id = 'client-documents');
        `
      },
      {
        name: 'Public can view files',
        sql: `
          CREATE POLICY IF NOT EXISTS "Public can view files"
          ON storage.objects
          FOR SELECT
          TO public
          USING (bucket_id = 'client-documents');
        `
      },
      {
        name: 'Authenticated users can update files',
        sql: `
          CREATE POLICY IF NOT EXISTS "Authenticated users can update files"
          ON storage.objects
          FOR UPDATE
          TO authenticated
          USING (bucket_id = 'client-documents')
          WITH CHECK (bucket_id = 'client-documents');
        `
      },
      {
        name: 'Authenticated users can delete files',
        sql: `
          CREATE POLICY IF NOT EXISTS "Authenticated users can delete files"
          ON storage.objects
          FOR DELETE
          TO authenticated
          USING (bucket_id = 'client-documents');
        `
      }
    ];

    for (const policy of policies) {
      const { error: policyError } = await supabase.rpc('exec_sql', { 
        sql_query: policy.sql 
      });
      
      if (policyError) {
        console.log(`⚠️  Política "${policy.name}": ${policyError.message}`);
      } else {
        console.log(`✅ Política "${policy.name}" configurada`);
      }
    }

    console.log('\n3️⃣ Testando upload...');
    
    // 4. Testar upload
    const testFile = new Blob(['test'], { type: 'text/plain' });
    const testFileName = `test/test-${Date.now()}.txt`;
    
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(testFileName, testFile);

    if (uploadError) {
      console.error('❌ Erro no teste de upload:', uploadError);
      console.log('\n⚠️  ATENÇÃO: Execute as políticas manualmente no SQL Editor do Supabase');
      console.log('Acesse: https://supabase.com/dashboard/project/ejqsaloqrczyfiqljcym/sql\n');
    } else {
      console.log('✅ Upload funcionando!\n');
      
      // Limpar arquivo de teste
      await supabase.storage
        .from('client-documents')
        .remove([testFileName]);
      
      console.log('🎉 Configuração concluída com sucesso!');
      console.log('\n✅ O sistema de anexos está pronto para uso!\n');
    }

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

setupStorage();
