# AgendamentoForm.tsx - Múltiplos Procedimentos Concluído ✅

## Data: 11 de Janeiro de 2025

## Resumo
Implementação completa de múltiplos procedimentos no formulário público de agendamento (`AgendamentoForm.tsx`). Clientes agora podem selecionar e agendar múltiplos procedimentos para um único horário.

---

## 🎯 Funcionalidades Implementadas

### 1. **Interface do Usuário (UI)**

#### Estado de Múltiplos Procedimentos
```typescript
const [selectedProcedures, setSelectedProcedures] = useState<Array<{
  id: string, 
  procedure: Procedure | null
}>>([{ id: 'temp-1', procedure: null }]);
```

#### Componentes Visuais Adicionados:

1. **Botão Inicial de Conversão**
   - Aparece quando um procedimento é selecionado
   - Texto: "Adicionar mais um procedimento"
   - Converte modo single → multiple

2. **Lista de Procedimentos Selecionados**
   - Numeração automática (1, 2, 3...)
   - Exibição de duração e preço por procedimento
   - Botão "X" para remover (exceto primeiro)

3. **Caixa de Totais Destacada**
   - Fundo colorido (`bg-primary/10`)
   - Duração Total em minutos
   - Valor Total em R$

4. **Popover de Adição**
   - Componente `Command` com busca
   - Filtra procedimentos já selecionados
   - Input de busca: "Buscar procedimento..."
   - Botão: "Adicionar mais um procedimento" (com ícone Plus)

### 2. **Lógica de Submit**

#### Detecção de Modo
```typescript
const hasMultipleProcedures = selectedProcedures.length > 0 && selectedProcedures[0].procedure !== null;
const proceduresToSave = hasMultipleProcedures 
  ? selectedProcedures.filter(sp => sp.procedure !== null)
  : [{ id: 'temp', procedure: selectedProcedure }];
```

#### Cálculo de Duração Total
```typescript
const totalDuration = proceduresToSave.reduce((sum, sp) => sum + (sp.procedure?.duration || 0), 0);
```

#### Salvamento em appointments_procedures
```typescript
const proceduresData = proceduresToSave.map((sp, index) => ({
  appointment_id: appointmentId,
  procedure_id: sp.procedure!.id,
  order_index: index
}));

await supabase
  .from('appointments_procedures')
  .insert(proceduresData);
```

### 3. **Notificações Atualizadas**

#### Webhook n8n
- `has_multiple_procedures`: boolean
- `all_procedures`: array com id, name, price, duration
- `total_duration`: duração total
- `total_price`: preço total

#### WhatsApp (Cliente)
```typescript
const procedureName = hasMultipleProcedures
  ? proceduresToSave.map((sp, idx) => `${idx + 1}. ${sp.procedure!.name}`).join('\n')
  : selectedProc?.name || '';
```

#### Notificação Proprietária
```typescript
const ownerNotifyData = {
  procedureName: procedureNameForNotification, // Lista numerada
  hasMultipleProcedures: boolean,
  totalDuration: totalDuration
};
```

#### Email Admins
- Mesmos campos de múltiplos procedimentos
- Formatação com quebra de linha

---

## 📊 Estrutura de Dados

### appointments_procedures (Novo)
```sql
CREATE TABLE appointments_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  procedure_id uuid NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### Compatibilidade Backward
- `appointments.procedure_id` mantido (primeiro procedimento)
- Sistema híbrido: funciona com single ou multiple
- Queries JOIN com appointments_procedures quando existir

---

## 🔄 Fluxo de Uso

### Cenário 1: Procedimento Único (Legado)
1. Cliente seleciona 1 procedimento
2. Vê botão "Adicionar mais um procedimento"
3. Pode submeter diretamente (modo single)
4. Sistema salva procedure_id normalmente

### Cenário 2: Múltiplos Procedimentos (Novo)
1. Cliente seleciona procedimento inicial
2. Clica em "Adicionar mais um procedimento"
3. Popover abre com lista pesquisável
4. Seleciona 2º procedimento → adiciona à lista
5. Vê totais calculados automaticamente
6. Pode adicionar 3º, 4º... procedimentos
7. Pode remover procedimentos (exceto primeiro)
8. Ao submeter:
   - Cria appointment com primeiro procedure_id
   - Insere todos em appointments_procedures
   - Notificações incluem lista completa
   - Calendário bloqueia duração total

---

## 🎨 Experiência do Usuário

### Visual
- **Lista Numerada**: Clara indicação de ordem
- **Totais Destacados**: Fundo colorido, fácil visualização
- **Botões Intuitivos**: Plus icon, X para remover
- **Busca Rápida**: Filtro em tempo real

### Feedback
- Toast de sucesso inclui confirmação
- Notificações WhatsApp formatadas
- Emails com informações completas

---

## 🧪 Próximos Passos de Teste

1. **Teste Single Procedure**
   - Selecionar 1 procedimento
   - Submeter
   - Verificar calendar mostra corretamente

2. **Teste Multiple Procedures**
   - Adicionar 2º procedimento
   - Adicionar 3º procedimento
   - Verificar totais calculados
   - Submeter
   - Verificar appointments_procedures tem 3 registros
   - Verificar calendar mostra lista
   - Verificar notificações recebidas

3. **Teste Remoção**
   - Adicionar 3 procedimentos
   - Remover o 2º
   - Verificar order_index correto

4. **Teste Edição**
   - Editar agendamento existente
   - Adicionar procedimentos
   - Verificar procedimentos antigos deletados
   - Verificar novos salvos

---

## 📝 Alterações em Código

### Arquivos Modificados
- ✅ `src/components/agendamento/AgendamentoForm.tsx`

### Linhas Adicionadas
- ~150 linhas de UI
- ~50 linhas de lógica submit
- ~30 linhas de notificações

### Imports Adicionados
```typescript
import { Plus } from "lucide-react";
```

### Estados Adicionados
```typescript
selectedProcedures
editingProcedureIndex
additionalProcedureSearchOpen
additionalSearchQuery
```

---

## ✅ Checklist de Implementação

- [x] Estado para múltiplos procedimentos
- [x] UI botão de conversão single → multiple
- [x] UI lista de procedimentos selecionados
- [x] UI botões de remoção
- [x] UI caixa de totais
- [x] UI Popover de busca e adição
- [x] Lógica de cálculo de duração total
- [x] Lógica de cálculo de preço total
- [x] Salvamento em appointments_procedures
- [x] Atualização de notificações webhook
- [x] Atualização de notificações WhatsApp
- [x] Atualização de notificações email
- [x] Compatibilidade backward com single procedure
- [x] Suporte a edição (delete + insert)

---

## 🚀 Status Final

**AgendamentoForm.tsx está 100% completo para múltiplos procedimentos!**

Próximas implementações:
1. NewAppointmentForm.tsx (admin)
2. SimpleAppointmentForm.tsx (cliente panel)
3. Testes end-to-end
4. Atualização loadAvailableTimes (se necessário)
