# 🤖 Integração VS Code + Supabase para IA

Este guia configura a integração completa para que EU (GitHub Copilot/agente de IA) possa fazer mudanças automaticamente no seu Supabase quando você pedir.

## ⚡ Configuração Rápida (1 minuto)

### 1. Adicione a Service Role Key no .env

Abra seu arquivo `.env` e adicione esta linha (substitua pelo valor real):

```env
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey..."
```

**🔑 Onde encontrar:**
1. Acesse: https://supabase.com/dashboard/project/ejqsaloqrczyfiqljcym/settings/api
2. Role para baixo até "service_role"
3. Clique no ícone do olho para revelar
4. Copie e cole no .env

### 2. Teste a conexão

```powershell
node supabase-helper.cjs test
```

Deve exibir: `✅ Conexão OK!`

### 3. (Opcional) Configure o helper exec_sql

Para habilitar operações DDL (criar tabelas, etc), aplique esta migration:

```powershell
node supabase-helper.cjs apply-migration 20251009120100_create_exec_sql_function.sql
```

## 🎉 Pronto!

Agora quando você pedir coisas como:

- "Crie uma tabela chamada X com colunas Y e Z"
- "Adicione uma coluna 'email' na tabela users"
- "Crie um bucket chamado 'documentos'"
- "Faça upload do arquivo logo.png para o bucket images"

**EU vou executar automaticamente** usando o `supabase-helper.cjs` - sem você precisar fazer nada manual!

## 📋 Comandos Disponíveis

Você também pode usar diretamente:

```powershell
# Testar conexão
node supabase-helper.cjs test

# Aplicar uma migration
node supabase-helper.cjs apply-migration 20251009120000_create_ai_agent_logs.sql

# Executar SQL direto
node supabase-helper.cjs exec-sql "select count(*) from clients"

# Criar tabela
node supabase-helper.cjs create-table users '[{"name":"id","type":"uuid","primaryKey":true}]'

# Criar bucket
node supabase-helper.cjs create-bucket documentos public

# Upload de arquivo
node supabase-helper.cjs upload images logo.png ./public/images/logo.png
```

## 🔒 Segurança

- ✅ Service Role Key fica APENAS no seu `.env` local
- ✅ `.env` está no `.gitignore` (nunca vai para o GitHub)
- ✅ Todas as operações são auditadas
- ✅ Apenas EU (agente de IA) uso via terminal local

## ❓ Troubleshooting

### "Cannot find module 'dotenv'"
```powershell
npm install dotenv
```

### "SUPABASE_SERVICE_ROLE_KEY não encontrada"
Adicione a key no `.env` conforme passo 1 acima.

### "exec_sql function not found"
Aplique a migration:
```powershell
node supabase-helper.cjs apply-migration 20251009120100_create_exec_sql_function.sql
```
