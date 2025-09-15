-- Add specification_id to body_area_groups table to associate areas with specific specifications
ALTER TABLE public.body_area_groups 
ADD COLUMN specification_id UUID REFERENCES public.procedure_specifications(id) ON DELETE CASCADE;

-- Update existing body_area_groups to be nullable for procedure_id since now they can be linked to specifications
ALTER TABLE public.body_area_groups 
ALTER COLUMN procedure_id DROP NOT NULL;