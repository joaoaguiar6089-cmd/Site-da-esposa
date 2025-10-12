# Debug: Botão Salvar Timezone Não Funciona

## 🐛 Problema Relatado

O botão "Salvar Configurações" após alterar o fuso horário **não faz nada**.

## 🔍 Logs de Debug Adicionados

Adicionamos logs detalhados para identificar onde o processo está falhando.

### TimezoneSettings.tsx

```typescript
const handleSave = async () => {
  console.log('🔵 handleSave chamado');
  console.log('selectedTz:', selectedTz);
  
  if (!selectedTz) {
    console.log('❌ selectedTz é null/undefined');
    return;
  }

  try {
    setSaving(true);
    console.log('🟡 Chamando updateTimezone...', {
      value: selectedTz.value,
      label: selectedTz.label
    });
    
    await updateTimezone(selectedTz.value, selectedTz.label);
    console.log('✅ updateTimezone concluído');
    
    // ... toast de sucesso
  } catch (error) {
    console.error('❌ Erro ao salvar:', error);
    // ... toast de erro
  } finally {
    setSaving(false);
    console.log('🔵 handleSave finalizado');
  }
};
```

### useTimezone.tsx

```typescript
const updateTimezone = async (newTimezone: string, newTimezoneName: string) => {
  console.log('🔵 useTimezone.updateTimezone chamado:', { newTimezone, newTimezoneName });
  
  try {
    console.log('🟡 Atualizando timezone no banco...');
    const { error: tzError } = await supabase
      .from('system_settings')
      .update({ setting_value: newTimezone })
      .eq('setting_key', 'timezone');

    if (tzError) {
      console.error('❌ Erro ao atualizar timezone:', tzError);
      throw tzError;
    }
    console.log('✅ Timezone atualizado no banco');

    console.log('🟡 Atualizando timezone_name no banco...');
    // ... atualizar timezone_name
    console.log('✅ Timezone_name atualizado no banco');

    console.log('🟡 Limpando cache do dateUtils...');
    clearTimezoneCache();
    console.log('✅ Cache limpo');

    console.log('🟡 Atualizando estado local...');
    setTimezone(newTimezone);
    setTimezoneName(newTimezoneName);
    console.log('✅ Estado local atualizado');
    
    console.log('✅ updateTimezone concluído com sucesso');
  } catch (error) {
    console.error('❌ Erro ao atualizar timezone:', error);
    throw error;
  }
};
```

## 🧪 Como Testar

### 1. Abrir Console do Navegador

1. Pressione **F12** (ou **Ctrl+Shift+I** / **Cmd+Option+I**)
2. Vá na aba **Console**
3. Limpe o console (botão de lixeira ou **Ctrl+L**)

### 2. Tentar Salvar Timezone

1. Vá em **Admin → Configurações → Timezone**
2. Selecione **Manaus (UTC-4)**
3. Clique no botão **"Salvar Configurações"**
4. Observe os logs no console

### 3. Interpretar os Logs

#### ✅ Cenário 1: Tudo Funcionando

```
🔵 handleSave chamado
selectedTz: {value: "America/Manaus", label: "Manaus (UTC-4)", ...}
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
🔵 handleSave finalizado
```

**Resultado:** Toast de sucesso aparece, sidebar atualiza.

#### ❌ Cenário 2: handleSave Não É Chamado

```
(Nenhum log aparece)
```

**Problema:** Evento de clique não está sendo capturado.

**Possíveis Causas:**
- Botão está `disabled`
- Elemento pai está interceptando o evento
- JavaScript não está carregado
- Erro anterior travou a aplicação

**Solução:**
- Verificar se `selectedTimezone === timezone` (botão fica disabled)
- Verificar se há erro no console antes de clicar
- Recarregar página (**Ctrl+F5**)

#### ❌ Cenário 3: selectedTz é null

```
🔵 handleSave chamado
selectedTz: undefined
❌ selectedTz é null/undefined
```

**Problema:** Timezone selecionado não está sendo encontrado.

**Solução:**
- Verificar se `BRAZILIAN_TIMEZONES` tem os dados corretos
- Verificar se `selectedTimezone` tem um valor válido

#### ❌ Cenário 4: Erro no Banco de Dados

```
🔵 handleSave chamado
selectedTz: {value: "America/Manaus", ...}
🟡 Chamando updateTimezone...
🔵 useTimezone.updateTimezone chamado: ...
🟡 Atualizando timezone no banco...
❌ Erro ao atualizar timezone: {message: "...", ...}
❌ Erro ao salvar: Error: ...
🔵 handleSave finalizado
```

**Problema:** Erro ao atualizar no Supabase.

**Possíveis Causas:**
- RLS (Row Level Security) bloqueando update
- Tabela `system_settings` não existe
- Conexão com banco falhou
- Permissões insuficientes

**Solução:**
- Verificar se tabela `system_settings` existe
- Verificar RLS policies
- Verificar se usuário está autenticado
- Verificar conexão com Supabase

#### ❌ Cenário 5: Erro ao Atualizar timezone_name

```
🔵 handleSave chamado
🟡 Chamando updateTimezone...
🔵 useTimezone.updateTimezone chamado: ...
🟡 Atualizando timezone no banco...
✅ Timezone atualizado no banco
🟡 Atualizando timezone_name no banco...
❌ Erro ao atualizar timezone_name: {message: "...", ...}
❌ Erro ao salvar: Error: ...
```

**Problema:** Primeiro update funcionou, segundo falhou.

**Solução:**
- Verificar se existe registro com `setting_key = 'timezone_name'`
- Verificar RLS policies

## 🔧 Verificações Importantes

### 1. Verificar Tabela system_settings

Execute no **SQL Editor** do Supabase:

```sql
-- Ver todos os registros
SELECT * FROM system_settings;

-- Ver especificamente timezone
SELECT * FROM system_settings WHERE setting_key IN ('timezone', 'timezone_name');
```

**Deve retornar algo como:**
```
setting_key   | setting_value        | description
--------------+----------------------+---------------------------
timezone      | America/Sao_Paulo    | Fuso horário do sistema
timezone_name | Brasília (UTC-3)     | Nome amigável do fuso
```

### 2. Verificar RLS Policies

```sql
-- Ver policies da tabela
SELECT * FROM pg_policies WHERE tablename = 'system_settings';
```

**Deve ter:**
- Policy para `SELECT` (permitir leitura)
- Policy para `UPDATE` (permitir atualização para admins)

### 3. Verificar Autenticação

No console do navegador:

```javascript
// Ver usuário logado
const { data: { user } } = await window.supabase.auth.getUser();
console.log('User:', user);

// Testar update diretamente
const { data, error } = await window.supabase
  .from('system_settings')
  .update({ setting_value: 'America/Manaus' })
  .eq('setting_key', 'timezone');
  
console.log('Data:', data);
console.log('Error:', error);
```

### 4. Verificar Botão Disabled

No console do navegador, após selecionar o timezone:

```javascript
// Ver estado do botão
const button = document.querySelector('button:has(> svg.lucide-save)');
console.log('Button disabled:', button?.disabled);
console.log('Button text:', button?.textContent);
```

Se `disabled: true`, o botão não vai responder ao clique.

## 📋 Checklist de Troubleshooting

- [ ] **Abrir console do navegador (F12)**
- [ ] **Limpar console**
- [ ] **Ir em Admin → Configurações → Timezone**
- [ ] **Selecionar um timezone diferente (ex: Manaus)**
- [ ] **Clicar no botão "Salvar Configurações"**
- [ ] **Verificar se aparecem logs no console**
- [ ] **Copiar todos os logs e enviar**

### Se NENHUM log aparecer:

- [ ] **Verificar se botão está desabilitado** (cinza/não clicável)
- [ ] **Verificar se há erros no console antes de clicar**
- [ ] **Tentar recarregar a página com Ctrl+F5**
- [ ] **Verificar se o código foi atualizado** (ver timestamp do arquivo)

### Se aparecer erro de banco:

- [ ] **Copiar mensagem de erro completa**
- [ ] **Executar queries SQL acima para verificar tabela**
- [ ] **Verificar se está logado como admin**
- [ ] **Verificar conexão com Supabase**

## 🎯 Próximos Passos

1. **Execute o teste acima**
2. **Copie TODOS os logs do console**
3. **Envie os logs** para análise
4. **Se houver erro, envie também**:
   - Mensagem de erro completa
   - Screenshot do console
   - Resultado das queries SQL

## 📝 Arquivos Modificados

- ✅ `src/components/admin/TimezoneSettings.tsx` - Logs adicionados
- ✅ `src/hooks/useTimezone.tsx` - Logs detalhados adicionados
- ✅ Zero erros de compilação

---

**Com esses logs, conseguiremos identificar exatamente onde o processo está falhando!** 🔍
