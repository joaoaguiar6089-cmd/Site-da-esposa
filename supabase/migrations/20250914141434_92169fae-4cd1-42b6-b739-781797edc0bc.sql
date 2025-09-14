-- Adicionar campo requires_specifications na tabela procedures
ALTER TABLE public.procedures 
ADD COLUMN requires_specifications boolean DEFAULT false;

-- Criar tabela para especificações de procedimentos
CREATE TABLE public.procedure_specifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    procedure_id uuid NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price numeric NOT NULL DEFAULT 0,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Criar tabela para especificações selecionadas em agendamentos
CREATE TABLE public.appointment_specifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    specification_id uuid NOT NULL REFERENCES public.procedure_specifications(id) ON DELETE CASCADE,
    specification_name text NOT NULL,
    specification_price numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.procedure_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_specifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para procedure_specifications
CREATE POLICY "Anyone can view active specifications" 
ON public.procedure_specifications 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage specifications" 
ON public.procedure_specifications 
FOR ALL 
USING (is_active_admin());

-- Políticas RLS para appointment_specifications
CREATE POLICY "Admins can manage appointment specifications" 
ON public.appointment_specifications 
FOR ALL 
USING (is_active_admin());

CREATE POLICY "Clients can view their appointment specifications" 
ON public.appointment_specifications 
FOR SELECT 
USING (appointment_id IN (
    SELECT a.id 
    FROM appointments a
    JOIN clients c ON a.client_id = c.id
    WHERE c.cpf = get_current_user_cpf()
));

CREATE POLICY "Allow specification creation for appointments" 
ON public.appointment_specifications 
FOR INSERT 
WITH CHECK (appointment_id IN (SELECT id FROM appointments));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_procedure_specifications_updated_at
    BEFORE UPDATE ON public.procedure_specifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para performance
CREATE INDEX idx_procedure_specifications_procedure_id ON public.procedure_specifications(procedure_id);
CREATE INDEX idx_procedure_specifications_active ON public.procedure_specifications(is_active);
CREATE INDEX idx_appointment_specifications_appointment_id ON public.appointment_specifications(appointment_id);
CREATE INDEX idx_appointment_specifications_specification_id ON public.appointment_specifications(specification_id);