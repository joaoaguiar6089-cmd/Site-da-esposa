-- Habilitar RLS nas tabelas que não têm RLS habilitado
ALTER TABLE appointment_selected_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals_public ENABLE ROW LEVEL SECURITY;

-- Criar políticas para appointment_selected_areas
CREATE POLICY "Admins can manage appointment selected areas" 
ON appointment_selected_areas 
FOR ALL 
USING (is_active_admin());

CREATE POLICY "Clients can view their appointment selected areas" 
ON appointment_selected_areas 
FOR SELECT 
USING (appointment_id IN (
  SELECT a.id 
  FROM appointments a 
  JOIN clients c ON a.client_id = c.id 
  WHERE c.cpf = get_current_user_cpf()
));

CREATE POLICY "Allow creation of appointment selected areas" 
ON appointment_selected_areas 
FOR INSERT 
WITH CHECK (appointment_id IN (SELECT id FROM appointments));

-- Criar políticas para professionals_public
CREATE POLICY "Anyone can view public professionals" 
ON professionals_public 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage public professionals" 
ON professionals_public 
FOR ALL 
USING (is_active_admin());