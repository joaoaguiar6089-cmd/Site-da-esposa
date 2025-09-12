-- Add is_symmetric column to body_areas table
ALTER TABLE public.body_areas 
ADD COLUMN is_symmetric boolean DEFAULT false;