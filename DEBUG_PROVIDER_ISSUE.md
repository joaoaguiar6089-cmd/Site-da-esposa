# Debug: useTimezone Fora do Provider

## 🐛 Problema Identificado

Nos logs do console aparecem avisos:
```
⚠️ useTimezone foi usado fora do TimezoneProvider. Usando valores padrão.
⚠️ updateTimezone chamado fora do TimezoneProvider
```

Isso significa que o componente `TimezoneSettings` não está conseguindo acessar o contexto do `TimezoneProvider`.

## 🔍 Possíveis Causas

1. **Provider não inicializou a tempo** - Componente renderiza antes do provider carregar
2. **Contexto perdido** - Problema na estrutura de componentes
3. **Dados não carregados do banco** - system_settings sem dados

## ✅ Logs Adicionados

### useTimezone.tsx (Provider)

```typescript
useEffect(() => {
  console.log('🚀 TimezoneProvider montado - iniciando loadSettings');
  loadSettings();
}, []);

const loadSettings = async () => {
  console.log('🔵 TimezoneProvider.loadSettings iniciado');
  // ...
  console.log('📊 Dados carregados do banco:', data);
  console.log('📋 Settings processados:', settings);
  console.log('🌍 Configurando timezone:', newTimezone);
  console.log('📛 Configurando timezoneName:', timezoneName);
  console.log('✅ loadSettings concluído');
  console.log('🔵 loadSettings finalizado (loading = false)');
};
```

### TimezoneSettings.tsx (Componente)

```typescript
const TimezoneSettings = () => {
  const timezoneContext = useTimezone();
  const { timezone, timezoneName, loading } = timezoneContext;
  
  console.log('🔍 TimezoneSettings renderizado:', {
    timezone,
    timezoneName,
    loading,
    contextCompleto: !!timezoneContext
  });
  // ...
};
```

## 🧪 Como Testar

### 1. Limpar Console e Recarregar

1. **F12** para abrir DevTools
2. **Ctrl+L** para limpar console
3. **Ctrl+F5** para recarregar página (hard refresh)

### 2. Observar Logs de Inicialização

Você deve ver esta sequência:

```
✅ Sequência Correta:
🚀 TimezoneProvider montado - iniciando loadSettings
🔵 TimezoneProvider.loadSettings iniciado
📊 Dados carregados do banco: [{setting_key: "timezone", ...}, ...]
📋 Settings processados: {timezone: "America/Sao_Paulo", ...}
🌍 Configurando timezone: America/Sao_Paulo
📛 Configurando timezoneName: Brasília (UTC-3)
✅ loadSettings concluído
🔵 loadSettings finalizado (loading = false)
🔍 TimezoneSettings renderizado: {timezone: "America/Sao_Paulo", ...}
```

```
❌ Sequência com Problema:
🔍 TimezoneSettings renderizado: {timezone: "America/Sao_Paulo", ...}
⚠️ useTimezone foi usado fora do TimezoneProvider
```

### 3. Verificar Dados no Banco

Se aparecer `📊 Dados carregados do banco: []` (array vazio), execute no Supabase SQL Editor:

```sql
-- Verificar se dados existem
SELECT * FROM system_settings;

-- Se vazio, inserir dados padrão
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('timezone', 'America/Sao_Paulo', 'Fuso horário do sistema'),
  ('timezone_name', 'Brasília (UTC-3)', 'Nome amigável do fuso horário'),
  ('date_format', 'DD/MM/YYYY', 'Formato de exibição de datas'),
  ('time_format', 'HH:mm', 'Formato de exibição de horas')
ON CONFLICT (setting_key) DO NOTHING;
```

### 4. Tentar Salvar Timezone

1. **Selecionar Manaus** no dropdown
2. **Clicar em "Salvar Configurações"**
3. **Observar logs:**

```
✅ Sucesso:
🔵 handleSave chamado
selectedTz: {value: "America/Manaus", label: "Manaus (UTC-4)", ...}
timezone do hook: America/Sao_Paulo
selectedTimezone (estado local): America/Sao_Paulo
🟡 Chamando updateTimezone...
🔵 useTimezone.updateTimezone chamado: {newTimezone: "America/Manaus", ...}
🟡 Atualizando timezone no banco...
✅ Timezone atualizado no banco
🟡 Atualizando timezone_name no banco...
✅ Timezone_name atualizado no banco
🟡 Limpando cache do dateUtils...
✅ Cache limpo
🟡 Atualizando estado local...
✅ Estado local atualizado
✅ updateTimezone concluído com sucesso
✅ updateTimezone concluído
✅ Badge deveria atualizar para: Manaus (UTC-4)
🔵 handleSave finalizado
🔄 useEffect: timezone do hook mudou para: America/Manaus
```

```
❌ Problema Persiste:
⚠️ useTimezone foi usado fora do TimezoneProvider
⚠️ updateTimezone chamado fora do TimezoneProvider
```

## 🔧 Soluções Baseadas nos Logs

### Cenário 1: Provider não inicializou

**Log:** `⚠️ useTimezone foi usado fora do TimezoneProvider` logo no início

**Solução:**
- Verificar se `App.tsx` tem `<TimezoneProvider>` envolvendo as rotas
- Verificar se não há erro antes do provider montar
- Tentar adicionar loading spinner até provider carregar

### Cenário 2: Dados não carregam do banco

**Log:** `📊 Dados carregados do banco: []` ou `❌ Erro ao carregar configurações`

**Solução:**
- Executar INSERT no banco (SQL acima)
- Verificar RLS policies da tabela `system_settings`
- Verificar conexão com Supabase

### Cenário 3: Tudo funciona mas UI não atualiza

**Log:** Todos os ✅ aparecem mas badge não muda

**Solução:**
- Verificar se `🔄 useEffect: timezone do hook mudou` aparece
- Se não aparecer, há problema no re-render
- Forçar re-render com key no componente

## 📋 Checklist

- [ ] **Recarregar página com Ctrl+F5**
- [ ] **Limpar console**
- [ ] **Verificar se logs de inicialização aparecem**
- [ ] **Verificar se provider carrega dados do banco**
- [ ] **Copiar TODOS os logs e enviar**
- [ ] **Se erro de banco, executar SQL acima**
- [ ] **Se nenhum log aparece, verificar se há erro antes**

## 🎯 Próximos Passos

Baseado nos logs que você enviar, podemos:
1. Identificar se é problema de inicialização
2. Identificar se é problema de dados no banco
3. Identificar se é problema de re-render
4. Aplicar correção específica

---

**Ação Necessária:** 
Recarregue a página (Ctrl+F5), copie TODOS os logs do console e envie.
Especialmente procure por:
- 🚀 (Provider montando)
- 📊 (Dados do banco)
- ⚠️ (Avisos de erro)
