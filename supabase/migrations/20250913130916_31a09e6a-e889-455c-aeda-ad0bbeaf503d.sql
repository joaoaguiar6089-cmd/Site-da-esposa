-- Adicionar coluna de gênero na tabela body_area_groups para diferenciar áreas masculinas e femininas
ALTER TABLE body_area_groups ADD COLUMN gender VARCHAR(10) DEFAULT 'female';

-- Criar tabela para configurações de desconto por quantidade de grupos selecionados
CREATE TABLE procedure_discount_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id UUID NOT NULL,
  min_groups INTEGER NOT NULL, -- Quantidade mínima de grupos para aplicar desconto
  max_groups INTEGER, -- Quantidade máxima (NULL = sem limite)
  discount_percentage DECIMAL(5,2) NOT NULL, -- Porcentagem de desconto (ex: 15.50 para 15.5%)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na nova tabela
ALTER TABLE procedure_discount_config ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para procedure_discount_config
CREATE POLICY "Admins can manage discount configs" 
ON procedure_discount_config 
FOR ALL 
USING (is_active_admin());

CREATE POLICY "Anyone can view active discount configs" 
ON procedure_discount_config 
FOR SELECT 
USING (is_active = true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_procedure_discount_config_updated_at
BEFORE UPDATE ON procedure_discount_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();