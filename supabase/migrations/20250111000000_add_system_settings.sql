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
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update system_settings"
  ON system_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
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
