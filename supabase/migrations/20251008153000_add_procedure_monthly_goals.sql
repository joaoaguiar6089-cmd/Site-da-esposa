-- Create table to store monthly sales goals for procedures and specifications
CREATE TABLE IF NOT EXISTS public.procedure_monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  specification_id UUID REFERENCES public.procedure_specifications(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  target_month DATE NOT NULL DEFAULT date_trunc('month', now()),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Helpful composite index to look up goals per month quickly
CREATE INDEX IF NOT EXISTS procedure_monthly_goals_month_idx
  ON public.procedure_monthly_goals (target_month);

-- Ensure procedure/specification combination is not duplicated for same month unintentionally
CREATE UNIQUE INDEX IF NOT EXISTS procedure_monthly_goals_unique_goal_idx
  ON public.procedure_monthly_goals (target_month, procedure_id, COALESCE(specification_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Enable row level security
ALTER TABLE public.procedure_monthly_goals ENABLE ROW LEVEL SECURITY;

-- Allow admins full control over the goals table
CREATE POLICY "Admins can manage procedure monthly goals" ON public.procedure_monthly_goals
  FOR ALL USING (is_active_admin());

-- Trigger to keep updated_at in sync
CREATE TRIGGER update_procedure_monthly_goals_updated_at
  BEFORE UPDATE ON public.procedure_monthly_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
