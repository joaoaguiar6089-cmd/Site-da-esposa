-- Adicionar campos para rastrear pacotes de sessões
ALTER TABLE public.appointments
ADD COLUMN package_parent_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
ADD COLUMN session_number INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN total_sessions INTEGER DEFAULT 1 NOT NULL;

-- Índice para melhorar performance de busca de sessões de um pacote
CREATE INDEX idx_appointments_package_parent ON public.appointments(package_parent_id);

-- Comentários para documentação
COMMENT ON COLUMN public.appointments.package_parent_id IS 'ID do agendamento pai (primeira sessão) se este for parte de um pacote';
COMMENT ON COLUMN public.appointments.session_number IS 'Número da sessão atual (1, 2, 3, etc)';
COMMENT ON COLUMN public.appointments.total_sessions IS 'Total de sessões do pacote';
