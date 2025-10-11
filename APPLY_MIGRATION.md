# 🚀 Executar Migration de Pacotes no Supabase

## Passo a Passo

### 1. Acesse o SQL Editor do Supabase
1. Vá para: https://supabase.com/dashboard/project/ejqsaloqrczyfiqljcym
2. No menu lateral, clique em **SQL Editor**
3. Clique em **New Query**

### 2. Execute o SQL abaixo

Copie e cole este SQL no editor e clique em **Run**:

```sql
-- Adicionar campos para rastrear pacotes de sessões
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS package_parent_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS session_number INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 1 NOT NULL;

-- Índice para melhorar performance de busca de sessões de um pacote
CREATE INDEX IF NOT EXISTS idx_appointments_package_parent ON public.appointments(package_parent_id);

-- Comentários para documentação
COMMENT ON COLUMN public.appointments.package_parent_id IS 'ID do agendamento pai (primeira sessão) se este for parte de um pacote';
COMMENT ON COLUMN public.appointments.session_number IS 'Número da sessão atual (1, 2, 3, etc)';
COMMENT ON COLUMN public.appointments.total_sessions IS 'Total de sessões do pacote';
```

### 3. Verifique se foi aplicada corretamente

Execute esta query para confirmar:

```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'appointments'
    AND column_name IN ('package_parent_id', 'session_number', 'total_sessions')
ORDER BY column_name;
```

Você deve ver 3 colunas:
- `package_parent_id` (uuid, nullable)
- `session_number` (integer, default 1)
- `total_sessions` (integer, default 1)

### 4. Após aplicar, volte aqui

Quando você executar o SQL e confirmar que funcionou, me avise que vou continuar implementando o resto do sistema de pacotes no código frontend.

---

## ⚠️ Observação

Adicionei `IF NOT EXISTS` para evitar erros caso os campos já existam. É seguro executar múltiplas vezes.
