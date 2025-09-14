-- Add requires_specifications field to procedures table if not exists
ALTER TABLE public.procedures 
ADD COLUMN IF NOT EXISTS requires_specifications boolean DEFAULT false;