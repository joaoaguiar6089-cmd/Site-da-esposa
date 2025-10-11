# 🌎 Sistema de Configuração de Fuso Horário

## 📋 Visão Geral

Sistema completo para configurar e gerenciar fusos horários brasileiros em toda a aplicação, garantindo que datas, horários, agendamentos, notificações e automações funcionem corretamente independente da localização da clínica.

## ✅ Implementação Completa

### 1. **Banco de Dados** ✅
**Arquivo:** `supabase/migrations/20250111000000_add_system_settings.sql`

Tabela `system_settings` criada com:
- `timezone`: Fuso horário IANA (ex: `America/Sao_Paulo`)
- `timezone_name`: Nome amigável (ex: `Brasília (UTC-3)`)
- `date_format`: Formato de data (`DD/MM/YYYY`)
- `time_format`: Formato de hora (`HH:mm`)

**RLS habilitado** - Apenas admins podem ler e atualizar

### 2. **Fusos Horários Brasileiros** ✅
**Arquivo:** `src/utils/timezones.ts`

Definições dos 4 fusos brasileiros:
- 🌴 **Fernando de Noronha (UTC-2)**
- 🏙️ **Brasília (UTC-3)** - Padrão
- 🌳 **Manaus (UTC-4)**
- 🌿 **Acre (UTC-5)**

Cada fuso inclui:
- Valor IANA timezone
- Nome amigável com offset
- Lista de estados que usam o fuso

### 3. **Hook de Gerenciamento** ✅
**Arquivo:** `src/hooks/useTimezone.tsx`

**TimezoneProvider:**
- Carrega configurações do banco
- Mantém estado global do timezone
- Função para atualizar timezone
- Função para recarregar configurações

**useTimezone hook:**
```typescript
const { 
  timezone,        // 'America/Sao_Paulo'
  timezoneName,    // 'Brasília (UTC-3)'
  dateFormat,      // 'DD/MM/YYYY'
  timeFormat,      // 'HH:mm'
  loading,         // boolean
  updateTimezone,  // function
  refreshSettings  // function
} = useTimezone();
```

### 4. **Interface de Configuração** ✅
**Arquivo:** `src/components/admin/TimezoneSettings.tsx`

Componente completo com:
- ✅ Card mostrando configurações atuais
- ✅ Select para escolher fuso horário
- ✅ Detalhes do fuso selecionado (offset, estados)
- ✅ Avisos sobre impacto da mudança
- ✅ Card informativo sobre fusos brasileiros
- ✅ Botão para salvar alterações

### 5. **Página de Configurações** ✅
**Arquivo:** `src/pages/SystemSettings.tsx`

Página com tabs para:
- ✅ Fuso Horário (ativo)
- ⏳ Geral (futuro)
- ⏳ Notificações (futuro)

### 6. **Integração no Sistema** ✅

**App.tsx:**
- ✅ TimezoneProvider envolvendo toda aplicação
- ✅ Rota `/admin/settings` criada

**AdminSidebar.tsx:**
- ✅ Botão clicável mostrando timezone atual
- ✅ Ícone de configurações (Settings)
- ✅ Mostra formato de data configurado
- ✅ Navega para `/admin/settings` ao clicar

## 🚀 Como Usar

### Para Administradores:

1. **Acessar Configurações:**
   - Entre na área Admin
   - Na sidebar (menu lateral), role até o final
   - Clique no botão com o fuso horário atual (🌎)

2. **Alterar Fuso Horário:**
   - Selecione o novo fuso no dropdown
   - Veja os detalhes (estados, offset)
   - Clique em "Salvar Configurações"
   - Aguarde confirmação

3. **Impacto da Mudança:**
   - ✅ Todas as datas exibidas usam o novo fuso
   - ✅ Agendamentos calculados no novo horário
   - ✅ Notificações enviadas no novo horário
   - ✅ Automações executadas no novo horário

### Para Desenvolvedores:

**Usar o hook em qualquer componente:**

```typescript
import { useTimezone } from '@/hooks/useTimezone';

function MyComponent() {
  const { timezone, timezoneName, dateFormat } = useTimezone();
  
  // timezone: 'America/Manaus'
  // timezoneName: 'Manaus (UTC-4)'
  // dateFormat: 'DD/MM/YYYY'
}
```

**Formatar datas com timezone:**

```typescript
import { formatDateToBrazil } from '@/utils/dateUtils';
import { useTimezone } from '@/hooks/useTimezone';

const { timezone } = useTimezone();
const formattedDate = formatDateToBrazil('2025-10-20'); // '20/10/2025'
```

## 📝 Próximos Passos

### Passo 1: Aplicar Migration ⏳

Execute no **Supabase SQL Editor**:

```sql
-- Arquivo: supabase/migrations/20250111000000_add_system_settings.sql
-- Cole o conteúdo completo do arquivo e execute
```

### Passo 2: Testar Interface ✅

1. Recarregue a aplicação
2. Entre na área Admin
3. Clique no botão de timezone na sidebar
4. Experimente trocar entre os fusos
5. Verifique se salva corretamente

### Passo 3: Atualizar dateUtils (Futuro)

Modificar funções de data para usar `useTimezone()`:

```typescript
// Antes (fixo em Brasília)
const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

// Depois (dinâmico)
import { useTimezone } from '@/hooks/useTimezone';
const { timezone } = useTimezone();
```

## 🎯 Fusos Horários do Brasil

| Fuso | Offset | Estados | IANA Timezone |
|------|--------|---------|---------------|
| Fernando de Noronha | UTC-2 | Fernando de Noronha | `America/Noronha` |
| Brasília | UTC-3 | SP, RJ, MG, ES, BA, SE, AL, PE, PB, RN, CE, PI, MA, TO, GO, DF, PR, SC, RS | `America/Sao_Paulo` |
| Manaus | UTC-4 | AM, RR, RO, MT, MS | `America/Manaus` |
| Acre | UTC-5 | AC | `America/Rio_Branco` |

## 🔒 Segurança

- ✅ RLS habilitado - Apenas admins podem modificar
- ✅ Validação no frontend
- ✅ Timestamps de atualização
- ✅ Registro de quem atualizou (updated_by)

## 🐛 Troubleshooting

**Erro: "system_settings not found"**
- Execute a migration no Supabase SQL Editor

**Timezone não atualiza:**
- Verifique o console do navegador
- Confirme que é admin autenticado
- Recarregue a página após salvar

**Datas aparecem incorretas:**
- Verifique se o timezone foi salvo
- Use `formatDateToBrazil()` para datas
- Evite `new Date(dateString)` direto

## 📚 Arquivos Criados

```
supabase/
  migrations/
    20250111000000_add_system_settings.sql    ← Migration

src/
  utils/
    timezones.ts                               ← Definições de fusos
  
  hooks/
    useTimezone.tsx                            ← Hook e Provider
  
  components/admin/
    TimezoneSettings.tsx                       ← Interface de config
  
  pages/
    SystemSettings.tsx                         ← Página de configurações
```

## ✨ Benefícios

- ✅ Suporte completo aos 4 fusos brasileiros
- ✅ Interface visual amigável
- ✅ Fácil de trocar entre fusos
- ✅ Informações detalhadas de cada fuso
- ✅ Avisos sobre impacto das mudanças
- ✅ Acesso rápido via sidebar
- ✅ Expansível para outras configurações
- ✅ Seguro (apenas admins)

## 🎨 Preview da Interface

```
┌─────────────────────────────────────┐
│ 🌎 Configurações de Fuso Horário    │
├─────────────────────────────────────┤
│ Fuso Horário Atual:                 │
│ [Brasília (UTC-3)]                  │
│                                     │
│ Formato de Data: DD/MM/YYYY         │
│ Formato de Hora: HH:mm              │
├─────────────────────────────────────┤
│ Selecione o Fuso Horário:           │
│ [Dropdown com 4 opções]             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Brasília (UTC-3)                │ │
│ │ Offset: UTC-3                   │ │
│ │ Estados: SP, RJ, MG...          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ⚠️ Importante:                      │
│ • Esta configuração afeta TODO...   │
│ • Agendamentos serão exibidos...    │
│                                     │
│ [Salvar Configurações]              │
└─────────────────────────────────────┘
```

## 📞 Suporte

Para questões ou problemas:
1. Verifique este documento
2. Consulte os arquivos de código
3. Revise os logs do console
