-- Habilitar RLS na tabela reminder_logs que estava desabilitado
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- Criar política para admins poderem ver logs de lembrete
CREATE POLICY "Admins can view reminder logs" 
ON public.reminder_logs 
FOR SELECT 
USING (is_active_admin());

-- Permitir inserção de logs pelo sistema (funções seguras)
CREATE POLICY "System can insert reminder logs" 
ON public.reminder_logs 
FOR INSERT 
WITH CHECK (true);

-- Verificar e ajustar política da tabela clients para permitir verificação pública de celular
-- Esta política permite verificar se um cliente existe baseado no celular (essencial para login)
CREATE POLICY "Allow phone verification for login" 
ON public.clients 
FOR SELECT 
USING (true);