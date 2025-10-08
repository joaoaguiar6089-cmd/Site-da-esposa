ALTER TABLE public.procedures
ADD COLUMN IF NOT EXISTS material_cost NUMERIC;

ALTER TABLE public.procedure_specifications
ADD COLUMN IF NOT EXISTS material_cost NUMERIC;
