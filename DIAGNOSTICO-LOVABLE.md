# Diagnóstico: Por que o site não carrega no Lovable mas funciona no localhost?

## Análise Atual

### ✅ Confirmado - Remoto (Nuvem Supabase)
- A coluna `custom_price` **EXISTE** na tabela `appointments_procedures`
- Tipo: NUMERIC
- Nullable: YES (pode ser NULL)

### ❓ Desconhecido - Local (Docker/Supabase CLI)
- Docker Desktop não está rodando
- Não conseguimos verificar o schema local ainda

## Hipóteses Possíveis

### 1. **Migrations desincronizadas** (Mais provável)
**Cenário:** 
- Localhost pode ter migrations mais recentes que a nuvem
- Ou vice-versa: nuvem tem migrations que o local não tem

**Como verificar:**
```powershell
# Execute no PowerShell:
.\check-remote-migrations.ps1
```

Depois, compare com as migrations locais em `supabase/migrations/`

---

### 2. **Problema de Environment Variables no Lovable**
**Cenário:**
- Lovable pode estar usando SUPABASE_URL ou SUPABASE_ANON_KEY incorretos
- Ou variables não estão configuradas no Lovable

**Como verificar no Lovable:**
1. Abra o projeto no Lovable
2. Vá em Settings → Environment Variables
3. Confirme que estão corretos:
   - `VITE_SUPABASE_URL` = https://ejqsaloqrczyfiqljcym.supabase.co
   - `VITE_SUPABASE_ANON_KEY` = (sua chave anon)

---

### 3. **Build do Lovable falhando**
**Cenário:**
- Erro de compilação TypeScript
- Dependências faltando

**Como verificar:**
1. No Lovable, abra o console do navegador (F12)
2. Veja se há erros JavaScript/TypeScript
3. Confira o log de build do Lovable

---

### 4. **RLS (Row Level Security) bloqueando queries**
**Cenário:**
- Políticas de segurança do Supabase bloqueando acesso
- Permissões diferentes entre local e remoto

**Como verificar:**
```sql
-- Execute no Supabase SQL Editor (remoto):
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'appointments_procedures';
```

---

## Próximos Passos Recomendados

### Opção A: Investigar pelo Lovable (MAIS RÁPIDO)
1. Abra o projeto no Lovable
2. Abra o Developer Console (F12)
3. Vá para a aba "Console"
4. Tente carregar o site
5. **Copie e cole aqui TODOS os erros** que aparecerem em vermelho

### Opção B: Verificar Migrations (MAIS COMPLETO)
1. Execute `.\check-remote-migrations.ps1`
2. Acesse o Supabase SQL Editor e rode as queries
3. Compare os resultados com as migrations locais
4. Se houver diferenças, podemos aplicar as migrations faltantes

### Opção C: Iniciar Docker e comparar schemas
1. Inicie Docker Desktop
2. Execute: `supabase start`
3. Execute: `supabase db dump --local > local-schema.sql`
4. Compare com o schema remoto

---

## Qual você prefere fazer primeiro?

Recomendo **Opção A** - é a mais rápida e vai nos dar o erro exato do Lovable.
