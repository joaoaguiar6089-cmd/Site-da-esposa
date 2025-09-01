-- Adicionar política para permitir que administradores deletem logs de lembrete
CREATE POLICY "Admins can delete reminder logs" 
ON reminder_logs 
FOR DELETE 
USING (is_active_admin());