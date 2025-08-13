-- Adicionar coluna para configurar notificações por email dos administradores
ALTER TABLE public.admin_users 
ADD COLUMN email_notifications BOOLEAN NOT NULL DEFAULT true;

-- Adicionar coluna para armazenar email do administrador
ALTER TABLE public.admin_users 
ADD COLUMN email TEXT;