# IMPORTANTE: Atualizar Types do Supabase

## Contexto
Após aplicar a migration `20250111200000_add_appointments_procedures_table.sql`, a tabela `appointments_procedures` foi criada no banco de dados, mas os tipos TypeScript do Supabase ainda não foram atualizados.

## Solução Temporária
Usamos `(supabase as any)` para bypass dos types quando acessando `appointments_procedures`:

```typescript
await (supabase as any)
  .from('appointments_procedures')
  .delete()
  .eq('appointment_id', appointmentId);

const { error: proceduresError } = await (supabase as any)
  .from('appointments_procedures')
  .insert(proceduresData);
```

## Solução Definitiva
Regenerar os tipos TypeScript do Supabase:

### Opção 1: Via Supabase CLI
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

### Opção 2: Via Dashboard
1. Acesse Supabase Dashboard
2. Vá em API Docs
3. Copie os tipos TypeScript gerados
4. Cole em `src/types/supabase.ts`

### Opção 3: Script npm (se configurado)
```bash
npm run generate-types
```

## Após Regenerar Types

Remover os `as any` e usar types adequados:

```typescript
// De:
await (supabase as any)
  .from('appointments_procedures')
  .insert(proceduresData);

// Para:
await supabase
  .from('appointments_procedures')
  .insert(proceduresData);
```

## Arquivos Afetados
- `src/components/agendamento/AgendamentoForm.tsx` (linhas ~664, ~678)
- `src/components/admin/AdminCalendar.tsx` (queries com JOIN)
- `src/components/admin/AdminDashboard.tsx` (queries com JOIN)

## Status
⚠️ **PENDENTE** - Types precisam ser regenerados quando conveniente
✅ **FUNCIONANDO** - Código atual funciona com `as any` temporário
