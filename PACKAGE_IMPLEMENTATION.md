# Implementação de Sistema de Pacotes de Sessões

## 1. Migration do Banco de Dados

Execute a migration criada em:
`supabase/migrations/20250110000000_add_package_tracking_to_appointments.sql`

Campos adicionados à tabela `appointments`:
- `package_parent_id`: UUID (referência ao agendamento pai)
- `session_number`: INTEGER (número da sessão atual, 1, 2, 3...)
- `total_sessions`: INTEGER (total de sessões do pacote)

## 2. Arquivos Criados

### `/src/utils/packageUtils.ts`
Funções utilitárias para gerenciar pacotes:
- `getPackageInfo()`: Retorna informações sobre a sessão
- `getPackageValue()`: Calcula o valor considerando pacotes
- `getPackagePaymentStatus()`: Busca status de pagamento do pai
- `formatSessionProgress()`: Formata "2/5 sessões"

### `/src/types/client.ts`
Interfaces atualizadas com novos campos de pacote

## 3. Próximos Passos de Implementação

### 3.1. Atualizar Formulário de Agendamento
Arquivo: `src/components/agendamento/AgendamentoForm.tsx` ou `NewBookingFlow.tsx`

Quando um procedimento com `sessions > 1` for agendado:
1. Criar o primeiro agendamento (sessão 1) normalmente
2. Criar automaticamente os agendamentos de retorno (sessões 2, 3, 4...)
3. Cada retorno deve ter:
   - `package_parent_id` = ID do primeiro agendamento
   - `session_number` = 2, 3, 4...
   - `total_sessions` = número total de sessões
   - Datas espaçadas (sugestão: a cada 30 dias)

```typescript
// Exemplo de código a adicionar após criar primeiro agendamento
if (selectedProcedure.sessions && selectedProcedure.sessions > 1) {
  const firstAppointmentId = createdAppointment.id;
  
  for (let session = 2; session <= selectedProcedure.sessions; session++) {
    const returnDate = new Date(appointmentDate);
    returnDate.setDate(returnDate.getDate() + (session - 1) * 30); // 30 dias entre sessões
    
    await supabase.from('appointments').insert({
      client_id: clientId,
      procedure_id: procedureId,
      appointment_date: returnDate.toISOString().split('T')[0],
      appointment_time: appointmentTime,
      status: 'agendado',
      package_parent_id: firstAppointmentId,
      session_number: session,
      total_sessions: selectedProcedure.sessions,
    });
  }
}
```

### 3.2. Atualizar Listagem de Agendamentos
Arquivos: `AppointmentsList.tsx`, `AdminCalendar.tsx`, `AdminDashboard.tsx`

Usar as funções de `packageUtils.ts`:

```typescript
import { getPackageInfo, formatSessionProgress } from '@/utils/packageUtils';

// Na renderização
const packageInfo = getPackageInfo(appointment);
const displayName = packageInfo.displayName; // "Botox - Retorno - 2/5"
const progress = formatSessionProgress(appointment); // "2/5 sessões"
```

### 3.3. Atualizar Cálculos de Valor
Onde valores são somados (Dashboard, Relatórios, etc.):

```typescript
import { getPackageValue } from '@/utils/packageUtils';

// Substituir
const value = appointment.procedures.price;

// Por
const value = getPackageValue(appointment);
```

### 3.4. Espelhar Status de Pagamento
Quando exibir status de pagamento das sessões de retorno:

```typescript
import { getPackagePaymentStatus } from '@/utils/packageUtils';

// Ao invés de usar diretamente appointment.payment_status
const paymentStatus = await getPackagePaymentStatus(appointment, supabase);
```

### 3.5. Queries do Supabase
Adicionar os novos campos em todas as queries:

```typescript
.select(`
  id,
  appointment_date,
  appointment_time,
  status,
  package_parent_id,
  session_number,
  total_sessions,
  procedures (
    id,
    name,
    price,
    sessions
  )
`)
```

## 4. Regras de Negócio

### Valor Planejado
- **Sessão 1**: Conta o valor total do pacote
- **Sessões 2+**: Valor R$ 0,00 (já foi contabilizado)

### Status de Pagamento
- **Sessão 1**: Status normal (aguardando, pago, etc.)
- **Sessões 2+**: Espelha o status da sessão 1

### Nome do Procedimento
- **Sessão 1**: "Botox"
- **Sessão 2**: "Botox - Retorno - 2/5"
- **Sessão 3**: "Botox - Retorno - 3/5"

### Progresso
Exibir em cada agendamento: "2/5 sessões"

## 5. Testes

1. Criar um agendamento com procedimento de 5 sessões
2. Verificar se 5 agendamentos foram criados
3. Verificar se apenas o primeiro conta o valor
4. Verificar se os nomes estão corretos
5. Verificar se o status de pagamento é espelhado
6. Atualizar pagamento do primeiro e verificar reflexo nos outros

## 6. Melhorias Futuras

- Interface para reagendar sessões de retorno
- Notificações antes das sessões de retorno
- Relatório de pacotes em andamento
- Cancelamento em cascata (cancelar todas as sessões)
