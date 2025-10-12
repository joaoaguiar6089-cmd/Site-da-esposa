# Implementação: Múltiplos Procedimentos por Agendamento

## 📋 Resumo da Funcionalidade

Permitir que um cliente agende múltiplos procedimentos para serem realizados em um único horário na clínica. A duração total será a soma das durações de cada procedimento.

## 🗄️ Estrutura de Banco de Dados

### Nova Tabela: `appointments_procedures`

```sql
CREATE TABLE appointments_procedures (
  id UUID PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  procedure_id UUID REFERENCES procedures(id),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Migration criada:** `20250111200000_add_appointments_procedures_table.sql`

### Compatibilidade

- **Mantém** `appointments.procedure_id` como procedimento principal
- **Adiciona** `appointments_procedures` para múltiplos procedimentos
- Sistema híbrido: funciona com agendamentos antigos (1 procedimento) e novos (N procedimentos)

## 🎨 Interface do Usuário

### Componente: `MultipleProcedureSelector`

**Arquivo:** `src/components/agendamento/MultipleProcedureSelector.tsx`

**Funcionalidades:**
- ✅ Dropdown searchable para cada procedimento
- ✅ Botão "Adicionar mais um procedimento"
- ✅ Botão "X" para remover procedimentos (exceto o primeiro)
- ✅ Exibição de duração e valor de cada procedimento
- ✅ Soma total de duração e valor quando > 1 procedimento
- ✅ Validação: não permite adicionar procedimento duplicado
- ✅ Validação: não permite adicionar novo procedimento se anterior não está selecionado

### Layout Visual

```
┌─────────────────────────────────────────────────┐
│ [Selecione o procedimento 1          ▼]        │
│ Duração: 60 min • Valor: R$ 150,00             │
├─────────────────────────────────────────────────┤
│ [Selecione o procedimento 2          ▼]    [X] │
│ Duração: 30 min • Valor: R$ 80,00              │
├─────────────────────────────────────────────────┤
│ [+ Adicionar mais um procedimento]             │
├─────────────────────────────────────────────────┤
│ Duração Total: 90 minutos                      │
│ Valor Total: R$ 230,00                         │
└─────────────────────────────────────────────────┘
```

## 📝 Formulários a Atualizar

### 1. AgendamentoForm.tsx (Formulário Público)
**Localização:** `src/components/agendamento/AgendamentoForm.tsx`

**Mudanças necessárias:**
- Substituir seleção única de procedimento por `MultipleProcedureSelector`
- Calcular duração total para validação de horários
- Salvar múltiplos procedimentos em `appointments_procedures`
- Manter `procedure_id` com o primeiro procedimento (compatibilidade)

### 2. NewAppointmentForm.tsx (Formulário Admin)
**Localização:** `src/components/admin/NewAppointmentForm.tsx`

**Mudanças necessárias:**
- Mesma implementação do AgendamentoForm.tsx
- Integrar com sistema de notificações

### 3. SimpleAppointmentForm.tsx (Formulário Painel Cliente)
**Localização:** `src/components/admin/SimpleAppointmentForm.tsx`

**Mudanças necessárias:**
- Padronizar com outros formulários
- Adicionar `MultipleProcedureSelector`
- Implementar mesmas integrações (specs, body areas, etc)

## 🗓️ Visualizações a Atualizar

### 1. AdminCalendar.tsx

**Mudanças:**
- Query: incluir JOIN com `appointments_procedures`
- Exibição: mostrar todos os procedimentos
- Duração: calcular soma de durações
- Tooltip/Card: listar todos os procedimentos

**Exemplo:**
```
┌─────────────────────────────────┐
│ 10:00 - João Aguiar            │
│ • Epilação Pacote 1            │
│ • Limpeza de Pele              │
│ Duração: 90 min                │
└─────────────────────────────────┘
```

### 2. AdminDashboard.tsx

**Mudanças:**
- Query: incluir `appointments_procedures`
- Cards de agendamentos recentes: listar múltiplos procedimentos
- Cálculos de valor: considerar todos os procedimentos

**Exemplo:**
```
┌─────────────────────────────────────────┐
│ 📅 01/11/2025 10:00                     │
│ 👤 João Aguiar                          │
│ 💆 Procedimentos:                       │
│    • Epilação Pacote 1 - 60min - R$150 │
│    • Limpeza de Pele - 30min - R$80    │
│ ⏱️  Total: 90 minutos                   │
│ 💰 Total: R$ 230,00                     │
└─────────────────────────────────────────┘
```

### 3. ProcedureHistory.tsx

**Mudanças:**
- Exibir múltiplos procedimentos no histórico
- Manter informações de pagamento e progresso

## 💾 Lógica de Salvamento

### Criar Agendamento

```typescript
// 1. Criar appointment com primeiro procedimento
const { data: appointment } = await supabase
  .from('appointments')
  .insert({
    client_id,
    procedure_id: selectedProcedures[0].procedure.id, // Primeiro
    appointment_date,
    appointment_time,
    // ... outros campos
  })
  .select()
  .single();

// 2. Inserir todos os procedimentos em appointments_procedures
const proceduresToInsert = selectedProcedures.map((item, index) => ({
  appointment_id: appointment.id,
  procedure_id: item.procedure.id,
  order_index: index
}));

await supabase
  .from('appointments_procedures')
  .insert(proceduresToInsert);
```

### Ler Agendamento

```typescript
const { data } = await supabase
  .from('appointments')
  .select(`
    *,
    client:clients(*),
    procedure:procedures(*),
    appointment_procedures:appointments_procedures(
      order_index,
      procedure:procedures(*)
    )
  `)
  .order('order_index', { foreignTable: 'appointments_procedures' });
```

## 🔍 Queries Necessárias

### 1. Carregar Agendamento com Procedimentos

```sql
SELECT 
  a.*,
  json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'duration', p.duration,
      'price', p.price,
      'order_index', ap.order_index
    ) ORDER BY ap.order_index
  ) as procedures
FROM appointments a
LEFT JOIN appointments_procedures ap ON a.id = ap.appointment_id
LEFT JOIN procedures p ON ap.procedure_id = p.id
GROUP BY a.id;
```

### 2. Calcular Duração Total

```typescript
const totalDuration = appointment.appointment_procedures
  ?.reduce((sum, ap) => sum + (ap.procedure?.duration || 0), 0) || 0;
```

## ✅ Checklist de Implementação

- [x] Criar migration `appointments_procedures`
- [x] Criar componente `MultipleProcedureSelector`
- [ ] Atualizar `AgendamentoForm.tsx`
- [ ] Atualizar `NewAppointmentForm.tsx`
- [ ] Atualizar `SimpleAppointmentForm.tsx`
- [ ] Atualizar visualização no Calendário
- [ ] Atualizar visualização no Dashboard
- [ ] Atualizar ProcedureHistory
- [ ] Testar criação de agendamentos
- [ ] Testar edição de agendamentos
- [ ] Testar visualizações

## 🧪 Testes

### Cenários a Testar

1. **Criar agendamento com 1 procedimento**
   - Deve funcionar como antes (compatibilidade)

2. **Criar agendamento com 2+ procedimentos**
   - Deve calcular duração total corretamente
   - Deve bloquear horários na agenda
   - Deve exibir todos os procedimentos

3. **Editar agendamento**
   - Adicionar/remover procedimentos
   - Manter sincronização

4. **Visualizações**
   - Calendário mostra múltiplos procedimentos
   - Dashboard mostra múltiplos procedimentos
   - Histórico mostra múltiplos procedimentos

## 📚 Próximos Passos

1. Aplicar migration no Supabase
2. Implementar nos formulários (ordem: AgendamentoForm → NewAppointmentForm → SimpleAppointmentForm)
3. Atualizar visualizações
4. Testar extensivamente
5. Documentar para equipe
