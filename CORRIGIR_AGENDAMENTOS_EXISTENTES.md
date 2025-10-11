# 🔧 Como Corrigir os Agendamentos Existentes

## Problema
Os agendamentos de "Epilação Pacote 1" foram criados **antes** da implementação do sistema de sessões, então os campos `session_number` e `total_sessions` estão NULL no banco de dados.

## Solução: Atualizar os Agendamentos Existentes

### Passo 1: Abrir o Supabase SQL Editor
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)

### Passo 2: Verificar os Dados Atuais
Cole e execute este SQL para ver o estado atual:

```sql
SELECT 
  a.id,
  a.appointment_date,
  a.appointment_time,
  a.session_number,
  a.total_sessions,
  p.name,
  p.sessions,
  c.nome || ' ' || c.sobrenome as client_name,
  ROW_NUMBER() OVER (PARTITION BY a.client_id, a.procedure_id ORDER BY a.appointment_date, a.appointment_time) as calculated_session
FROM appointments a
JOIN procedures p ON a.procedure_id = p.id
JOIN clients c ON a.client_id = c.id
WHERE p.name ILIKE '%epilação%pacote%'
  AND a.status != 'cancelado'
ORDER BY c.id, a.appointment_date, a.appointment_time;
```

**O que você deve ver:**
- `session_number`: NULL ou 1
- `total_sessions`: NULL ou 1
- `calculated_session`: 1, 2, 3, 4... (a ordem correta calculada)

### Passo 3: Aplicar a Correção
Cole e execute este SQL para corrigir os dados:

```sql
WITH ranked_appointments AS (
  SELECT 
    a.id,
    p.sessions,
    ROW_NUMBER() OVER (PARTITION BY a.client_id, a.procedure_id ORDER BY a.appointment_date, a.appointment_time) as session_number
  FROM appointments a
  JOIN procedures p ON a.procedure_id = p.id
  WHERE p.name ILIKE '%epilação%pacote%'
    AND a.status != 'cancelado'
)
UPDATE appointments
SET 
  session_number = ranked_appointments.session_number,
  total_sessions = ranked_appointments.sessions
FROM ranked_appointments
WHERE appointments.id = ranked_appointments.id;
```

### Passo 4: Confirmar a Correção
Execute novamente o SELECT para verificar:

```sql
SELECT 
  a.id,
  a.appointment_date,
  a.appointment_time,
  a.session_number,
  a.total_sessions,
  p.name,
  c.nome || ' ' || c.sobrenome as client_name
FROM appointments a
JOIN procedures p ON a.procedure_id = p.id
JOIN clients c ON a.client_id = c.id
WHERE p.name ILIKE '%epilação%pacote%'
  AND a.status != 'cancelado'
ORDER BY c.id, a.appointment_date, a.appointment_time;
```

**Resultado esperado:**
```
19/10/2025 → session_number: 1, total_sessions: 5
29/10/2025 → session_number: 2, total_sessions: 5
30/10/2025 → session_number: 3, total_sessions: 5
31/10/2025 → session_number: 4, total_sessions: 5
```

### Passo 5: Recarregar a Aplicação
Depois de executar o UPDATE:
1. Volte para a Área do Cliente
2. Pressione **F5** para recarregar a página
3. Os nomes devem aparecer corretamente:
   - **"Epilação Pacote 1"** (primeira sessão)
   - **"Epilação Pacote 1 - Retorno - 2/5"** (segunda sessão)
   - **"Epilação Pacote 1 - Retorno - 3/5"** (terceira sessão)
   - **"Epilação Pacote 1 - Retorno - 4/5"** (quarta sessão)

## ✨ Próximos Agendamentos
Todos os **novos** agendamentos criados a partir de agora já serão salvos com os campos corretos automaticamente!

## 📝 Observações
- Este UPDATE só precisa ser feito **uma vez** para corrigir agendamentos antigos
- Agendamentos cancelados não são afetados
- Se você tiver outros procedimentos com pacotes, adapte a query trocando `'%epilação%pacote%'` pelo nome do procedimento
