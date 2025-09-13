-- Habilitar RLS na tabela body_area_groups que ainda não tem RLS
ALTER TABLE body_area_groups ENABLE ROW LEVEL SECURITY;

-- Criar políticas para body_area_groups
CREATE POLICY "Admins can manage body area groups" 
ON body_area_groups 
FOR ALL 
USING (is_active_admin());

CREATE POLICY "Anyone can view body area groups" 
ON body_area_groups 
FOR SELECT 
USING (true);