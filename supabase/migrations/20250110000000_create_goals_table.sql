-- Tabela de metas mensais
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  target_quantity INTEGER NOT NULL,
  target_value DECIMAL(10, 2) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(procedure_id, month, year)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_goals_procedure_id ON public.goals(procedure_id);
CREATE INDEX IF NOT EXISTS idx_goals_month_year ON public.goals(month, year);

-- RLS policies
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Apenas usuários autenticados podem acessar (admins)
CREATE POLICY "Authenticated users can manage goals" ON public.goals
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_goals_updated_at_trigger
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_goals_updated_at();

-- Comentários
COMMENT ON TABLE public.goals IS 'Metas mensais de procedimentos';
COMMENT ON COLUMN public.goals.procedure_id IS 'ID do procedimento vinculado à meta';
COMMENT ON COLUMN public.goals.target_quantity IS 'Quantidade de agendamentos realizados desejada';
COMMENT ON COLUMN public.goals.target_value IS 'Valor total recebido desejado';
COMMENT ON COLUMN public.goals.month IS 'Mês da meta (1-12)';
COMMENT ON COLUMN public.goals.year IS 'Ano da meta';
