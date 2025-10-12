# 🌎 Sistema de Fuso Horário - Documentação Importante

## ⚠️ ATENÇÃO: Comportamento do Sistema

### Como Funciona:

O sistema de configuração de fuso horário afeta **APENAS**:

1. ✅ **Novos agendamentos** criados após a mudança
2. ✅ **Exibição de datas** (formato DD/MM/YYYY)
3. ✅ **Automações e notificações** futuras
4. ✅ **Cálculos de horários** para agendamentos futuros

### O que NÃO é alterado:

❌ **Agendamentos existentes** no banco de dados permanecem INALTERADOS
- Os horários já salvos continuam exatamente como foram criados
- Se foram criados em Manaus, permanecem com horário de Manaus
- Se foram criados em Brasília, permanecem com horário de Brasília

## 📊 Exemplo Prático:

### Cenário:
Você tem agendamentos criados quando o sistema estava configurado para **Manaus (UTC-4)**:

```
Agendamento A: 20/10/2025 às 14:00 (criado em Manaus)
Agendamento B: 21/10/2025 às 15:30 (criado em Manaus)
```

### Mudança de Fuso:
Você altera o sistema para **Brasília (UTC-3)**

### Resultado:

**✅ Agendamentos existentes (INALTERADOS):**
```
Agendamento A: 20/10/2025 às 14:00  ← Continua 14:00
Agendamento B: 21/10/2025 às 15:30  ← Continua 15:30
```

**✅ Novos agendamentos:**
```
Agendamento C: 22/10/2025 às 16:00  ← Criado com horário de Brasília
```

## 🔧 Por que isso é importante?

### 1. Integridade de Dados
- Os agendamentos existentes representam compromissos já marcados
- Alterar horários retroativamente causaria conflitos e confusão
- Clientes e profissionais esperam o horário original

### 2. Histórico Confiável
- O histórico de agendamentos reflete quando realmente aconteceram
- Relatórios e estatísticas mantêm precisão
- Auditoria e compliance são preservados

### 3. Transição Suave
- Sistema permite mudança gradual de fuso
- Agendamentos antigos mantêm contexto original
- Novos agendamentos seguem novo padrão

## 💾 Como os Dados são Armazenados

No banco de dados Supabase:

```sql
-- Tabela appointments
appointment_date: DATE           -- Exemplo: 2025-10-20
appointment_time: TIME           -- Exemplo: 14:00:00
```

Estes campos são **independentes de timezone**:
- `DATE` é apenas dia/mês/ano
- `TIME` é apenas hora:minuto:segundo
- Não há conversão automática ao mudar configuração

## 📱 Impacto nas Funcionalidades

### Área do Cliente
- ✅ Vê agendamentos existentes com horários originais
- ✅ Novos agendamentos usam fuso configurado

### Calendário Admin
- ✅ Exibe todos agendamentos nos horários salvos
- ✅ Novos agendamentos criados com fuso atual

### Notificações/Lembretes
- ✅ Enviados baseados no horário salvo no agendamento
- ⚠️ Consideração: Se mudar fuso, configure lembretes para respeitar horário local da clínica

### Relatórios
- ✅ Mostram dados exatamente como foram registrados
- ✅ Não há distorção de horários históricos

## 🎯 Recomendações

### Se sua clínica mudou de cidade/fuso:

1. **Configure o novo fuso** no sistema
2. **Informe aos clientes** sobre a mudança
3. **Agendamentos antigos** permanecem com horário original (correto!)
4. **Novos agendamentos** seguirão o novo fuso

### Se precisa migrar dados de outro fuso:

Se você realmente precisa **converter** agendamentos antigos:

```sql
-- ATENÇÃO: Execute apenas se necessário e com backup!
-- Exemplo: Adicionar 1 hora a todos agendamentos (Manaus → Brasília)

UPDATE appointments
SET appointment_time = appointment_time + INTERVAL '1 hour'
WHERE appointment_date < '2025-01-11'  -- Data da mudança
  AND status != 'cancelado';

-- ⚠️ CUIDADO: Teste em ambiente de desenvolvimento primeiro!
```

## 📝 Checklist de Mudança de Fuso

Quando mudar o fuso horário do sistema:

- [ ] Fazer backup do banco de dados
- [ ] Configurar novo fuso no Admin
- [ ] Testar criação de novo agendamento
- [ ] Verificar se notificações funcionam corretamente
- [ ] Informar equipe sobre a mudança
- [ ] Atualizar materiais de comunicação com clientes
- [ ] Documentar a data da mudança para referência futura

## ✅ Conclusão

O sistema de fuso horário é **não-destrutivo**:
- Preserva integridade dos dados históricos
- Permite transição suave entre fusos
- Novos agendamentos seguem nova configuração
- Agendamentos antigos permanecem inalterados ✨

---

**Importante:** Este comportamento é intencional e segue as melhores práticas de gestão de dados temporais em sistemas de agendamento.
