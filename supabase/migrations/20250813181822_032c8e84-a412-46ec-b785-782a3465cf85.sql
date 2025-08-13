-- Adicionar campos necessários à tabela procedures para gerenciamento completo
ALTER TABLE public.procedures 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS benefits TEXT[],
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Permitir que admins modifiquem procedimentos
CREATE POLICY "Admins can manage procedures" 
ON public.procedures 
FOR ALL 
USING (is_active_admin());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_procedures_updated_at
BEFORE UPDATE ON public.procedures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();