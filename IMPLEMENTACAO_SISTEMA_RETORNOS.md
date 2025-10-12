# 🔄 Implementação: Sistema de Retornos Aprimorado

## 📋 Requisitos

### 1. Modal de Retorno com NewBookingFlow
**Atual:** Campos simples de data e horário
**Novo:** Usar NewBookingFlow completo com:
- Seleção de cidade
- Horários disponíveis baseados em agendamentos existentes
- Campo de observações
- Validação completa

### 2. Badge "Retorno" no AdminCalendar
**Atual:** Cards mostram apenas: horário, cliente, procedimento, preço
**Novo:** Adicionar badge "Retorno" ao lado do preço quando `return_of_appointment_id` não for null

### 3. Espelhar Status de Pagamento
**Atual:** Retorno criado sem informações de pagamento
**Novo:** Copiar do agendamento original:
- `payment_status`
- `payment_method`
- `payment_value`
- `payment_installments`

## 🗄️ Mudanças no Banco de Dados

### Migration: 20250112000000_add_return_appointment_field.sql
```sql
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS return_of_appointment_id UUID 
REFERENCES public.appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_return_of 
ON public.appointments(return_of_appointment_id);
```

**Status:** ✅ Criada

## 🔨 Implementação

### Fase 1: Atualizar AdminDashboard.tsx ⏳ IN PROGRESS

**Arquivo:** `src/components/admin/AdminDashboard.tsx`

#### 1.1 Adicionar Estado para NewBookingFlow
```typescript
const [showReturnBooking, setShowReturnBooking] = useState(false);
const [returnClient, setReturnClient] = useState<any>(null);
const [returnProcedureId, setReturnProcedureId] = useState<string>("");
const [originalAppointmentId, setOriginalAppointmentId] = useState<string>("");
```

#### 1.2 Importar NewBookingFlow
```typescript
import NewBookingFlow from "@/components/agendamento/NewBookingFlow";
```

#### 1.3 Modificar handleSavePaymentWithReturn
```typescript
const handleSavePaymentWithReturn = async () => {
  // Validações...

  try {
    // 1. Atualizar pagamento do agendamento atual
    const paymentData = {
      status: 'realizado',
      payment_status: paymentStatus,
      payment_method: paymentMethod || null,
      payment_value: paymentValue ? parseFloat(paymentValue) : null,
      payment_installments: paymentInstallments ? parseInt(paymentInstallments) : null,
      payment_notes: paymentNotes || null,
    };

    await supabase
      .from('appointments')
      .update(paymentData)
      .eq('id', selectedAppointment.id);

    // 2. Se tem retorno, abrir NewBookingFlow
    if (hasReturn) {
      setOriginalAppointmentId(selectedAppointment.id);
      setReturnClient(selectedAppointment.clients);
      setReturnProcedureId(selectedAppointment.procedures.id);
      setPaymentDialogOpen(false);
      setShowReturnBooking(true);
    } else {
      toast({ title: "Sucesso", description: "Pagamento salvo!" });
      setPaymentDialogOpen(false);
      loadRecentAppointments();
    }
  } catch (error) {
    // Erro...
  }
};
```

#### 1.4 Adicionar Callback onReturnSuccess
```typescript
const handleReturnSuccess = async (appointmentId: string) => {
  try {
    // Atualizar o retorno criado com:
    // 1. return_of_appointment_id
    // 2. payment info do original
    
    // Buscar payment info do original
    const { data: originalApp } = await supabase
      .from('appointments')
      .select('payment_status, payment_method, payment_value, payment_installments')
      .eq('id', originalAppointmentId)
      .single();

    if (originalApp) {
      await supabase
        .from('appointments')
        .update({
          return_of_appointment_id: originalAppointmentId,
          payment_status: originalApp.payment_status,
          payment_method: originalApp.payment_method,
          payment_value: originalApp.payment_value,
          payment_installments: originalApp.payment_installments,
        })
        .eq('id', appointmentId);
    }

    toast({
      title: "Sucesso!",
      description: "Retorno agendado com sucesso!",
    });

    setShowReturnBooking(false);
    loadRecentAppointments();
    loadStats();
  } catch (error) {
    console.error('Erro ao vincular retorno:', error);
    toast({
      title: "Aviso",
      description: "Retorno criado mas erro ao vincular ao original.",
      variant: "destructive",
    });
  }
};
```

#### 1.5 Adicionar Renderização Condicional
```typescript
// No return do componente, antes dos Dialogs:
if (showReturnBooking && returnClient) {
  return (
    <NewBookingFlow
      onBack={() => setShowReturnBooking(false)}
      onSuccess={handleReturnSuccess}
      adminMode={true}
      initialClient={returnClient}
      preSelectedProcedureId={returnProcedureId}
      sendNotification={true}
      allowPastDates={false}
    />
  );
}
```

#### 1.6 Remover Campos Simples de Data/Hora do Modal
```typescript
// REMOVER estas linhas do Dialog de Pagamento:
{hasReturn && (
  <div className="space-y-3 pl-6 border-l-2">
    <div>
      <label>Data do Retorno</label>
      <Input type="date" value={returnDate} ... />
    </div>
    <div>
      <label>Horário do Retorno</label>
      <Input type="time" value={returnTime} ... />
    </div>
  </div>
)}
```

### Fase 2: Atualizar AdminCalendar.tsx ⏸️ NOT STARTED

**Arquivo:** `src/components/admin/AdminCalendar.tsx`

#### 2.1 Atualizar Query para Buscar return_of_appointment_id
```typescript
const { data, error } = await supabase
  .from('appointments')
  .select(`
    *,
    return_of_appointment_id,  // ← ADICIONAR
    clients!inner (
      id,
      nome,
      sobrenome,
      celular,
      cpf
    ),
    procedures (
      id,
      name,
      price,
      duration
    ),
    // ... rest
  `)
  // ...
```

#### 2.2 Adicionar Badge "Retorno" nos Cards
```typescript
// Dentro do map de appointments no calendário:
<div className="flex items-center justify-between">
  <span className="font-medium">
    {currency(totalPrice)}
  </span>
  
  {/* ADICIONAR: */}
  {appointment.return_of_appointment_id && (
    <Badge 
      variant="secondary" 
      className="ml-2 bg-blue-100 text-blue-800 border-blue-300"
    >
      Retorno
    </Badge>
  )}
</div>
```

#### 2.3 Adicionar Badge no Modal de Detalhes
```typescript
// No Dialog de detalhes do agendamento:
{selectedAppointment?.return_of_appointment_id && (
  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="bg-blue-600 text-white">
        Retorno
      </Badge>
      <span className="text-sm text-blue-800">
        Este é um retorno de outro procedimento
      </span>
    </div>
  </div>
)}
```

### Fase 3: Atualizar AppointmentsList.tsx ⏸️ NOT STARTED

**Arquivo:** `src/components/admin/AppointmentsList.tsx`

Mesmas alterações do AdminDashboard:
- Substituir modal simples por NewBookingFlow
- Espelhar payment info
- Adicionar return_of_appointment_id

### Fase 4: Atualizar ProcedureHistory.tsx ⏸️ NOT STARTED

**Arquivo:** `src/components/admin/ProcedureHistory.tsx`

- Exibir badge "Retorno" nos appointments que tem return_of_appointment_id
- Mostrar link para o agendamento original

## 🧪 Testes

### Test Plan
1. ✅ Executar migration no Supabase
2. ⏸️ Marcar agendamento como realizado
3. ⏸️ Selecionar "Tem retorno?"
4. ⏸️ Preencher informações de pagamento
5. ⏸️ Clicar em "Salvar"
6. ⏸️ Verificar que abre NewBookingFlow
7. ⏸️ Selecionar cidade
8. ⏸️ Escolher data e horário (deve mostrar disponíveis)
9. ⏸️ Adicionar observações
10. ⏸️ Confirmar agendamento
11. ⏸️ Verificar no AdminCalendar que aparece badge "Retorno"
12. ⏸️ Verificar no banco que return_of_appointment_id está preenchido
13. ⏸️ Verificar que payment_status foi espelhado

### SQL para Verificar
```sql
-- Ver retornos criados
SELECT 
  a.id,
  a.appointment_date,
  a.appointment_time,
  a.return_of_appointment_id,
  a.payment_status,
  c.nome,
  p.name as procedure_name
FROM appointments a
LEFT JOIN clients c ON a.client_id = c.id
LEFT JOIN procedures p ON a.procedure_id = p.id
WHERE a.return_of_appointment_id IS NOT NULL
ORDER BY a.appointment_date DESC;

-- Ver agendamento original e seus retornos
SELECT 
  'Original' as tipo,
  a.*
FROM appointments a
WHERE a.id = 'ID_DO_ORIGINAL'

UNION ALL

SELECT 
  'Retorno' as tipo,
  a.*
FROM appointments a
WHERE a.return_of_appointment_id = 'ID_DO_ORIGINAL'
ORDER BY appointment_date;
```

## 📦 Arquivos Afetados

- ✅ `supabase/migrations/20250112000000_add_return_appointment_field.sql`
- ⏳ `src/components/admin/AdminDashboard.tsx` (IN PROGRESS)
- ⏸️ `src/components/admin/AdminCalendar.tsx`
- ⏸️ `src/components/admin/AppointmentsList.tsx`
- ⏸️ `src/components/admin/ProcedureHistory.tsx`

## 🎯 Próximos Passos

1. **AGORA:** Executar migration no Supabase
2. **DEPOIS:** Implementar Fase 1 (AdminDashboard)
3. **DEPOIS:** Implementar Fase 2 (AdminCalendar)
4. **DEPOIS:** Implementar Fase 3 e 4 (outros componentes)
5. **FINAL:** Testes end-to-end

---

**Notas:**
- NewBookingFlow já tem toda a lógica de horários disponíveis
- NewBookingFlow já valida conflitos de agendamento
- NewBookingFlow já tem integração com notificações
- Apenas precisamos passar os dados corretos e processar o callback
