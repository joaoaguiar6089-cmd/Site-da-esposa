# 🚀 Como Aplicar a Migration de System Settings

## Passo a Passo

### 1. Abrir Supabase SQL Editor
- Acesse https://supabase.com/dashboard
- Selecione seu projeto
- Vá em **SQL Editor** no menu lateral

### 2. Executar a Migration
Cole e execute o seguinte SQL:

```sql
-- Migration: Adicionar tabela de configurações de sistema
-- Inclui configuração de timezone para todo o sistema

-- Criar tabela system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Adicionar RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas: Admins podem ler e atualizar
CREATE POLICY "Admins can read system_settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can update system_settings"
  ON system_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
  );

-- Inserir configurações padrão
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('timezone', 'America/Sao_Paulo', 'Fuso horário do sistema (IANA timezone)'),
  ('timezone_name', 'Brasília (UTC-3)', 'Nome amigável do fuso horário'),
  ('date_format', 'DD/MM/YYYY', 'Formato de exibição de data'),
  ('time_format', 'HH:mm', 'Formato de exibição de hora')
ON CONFLICT (setting_key) DO NOTHING;

-- Criar índice para melhor performance
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- Comentários para documentação
COMMENT ON TABLE system_settings IS 'Configurações globais do sistema';
COMMENT ON COLUMN system_settings.setting_key IS 'Chave única da configuração';
COMMENT ON COLUMN system_settings.setting_value IS 'Valor da configuração';
COMMENT ON COLUMN system_settings.description IS 'Descrição da configuração';
```

### 3. Verificar Sucesso
Após executar, você deve ver a mensagem "Success. No rows returned".

Execute esta query para confirmar:
```sql
SELECT * FROM system_settings;
```

Resultado esperado:
```
timezone        | America/Sao_Paulo     | Fuso horário do sistema
timezone_name   | Brasília (UTC-3)      | Nome amigável do fuso horário
date_format     | DD/MM/YYYY            | Formato de exibição de data
time_format     | HH:mm                 | Formato de exibição de hora
```

### 4. Testar na Aplicação
1. Recarregue a aplicação (F5)
2. Entre na área Admin
3. Na sidebar, procure o botão **🌎 Brasília (UTC-3)**
4. Clique nele para abrir as configurações
5. Teste alterar o fuso horário

## ✅ Pronto!

O sistema de configuração de timezone está funcionando! 🎉

## 🔧 Solução de Problemas

### Erro: "relation already exists"
Se a tabela já existe, você pode:
1. Verificar se já está funcionando
2. Ou dropar e recriar: `DROP TABLE IF EXISTS system_settings CASCADE;`

### Erro: "permission denied"
Certifique-se de estar usando uma conta admin com permissões adequadas.

### Políticas não funcionam
Execute: `SELECT * FROM admin_users WHERE user_id = auth.uid();`
Para verificar se seu usuário está na tabela admin_users.
