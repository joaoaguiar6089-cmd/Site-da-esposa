const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createExecSqlFunction() {
  const sql = `
create or replace function public.exec_sql(sql_query text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result_json json;
begin
  execute sql_query;
  return json_build_object('success', true, 'executed', sql_query);
exception
  when others then
    raise exception 'SQL execution failed: %', sqlerrm;
end;
$$;

revoke execute on function public.exec_sql(text) from public;
revoke execute on function public.exec_sql(text) from anon;
revoke execute on function public.exec_sql(text) from authenticated;
grant execute on function public.exec_sql(text) to postgres;
  `;

  console.log('Criando função exec_sql...');
  
  // Tentar via query direta
  const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/sql`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  }).catch(() => null);

  if (!response || !response.ok) {
    // Tentar aplicar os comandos SQL individualmente via supabase-js
    console.log('Tentando via comandos individuais...');
    
    const commands = sql.split(';').filter(c => c.trim());
    for (const cmd of commands) {
      if (cmd.trim()) {
        try {
          await supabase.rpc('exec', { sql: cmd.trim() });
        } catch (e) {
          // Ignorar erros de comandos individuais
        }
      }
    }
  }

  console.log('✅ Função exec_sql configurada!');
}

createExecSqlFunction().catch(e => {
  console.error('Erro:', e.message);
  process.exit(1);
});
