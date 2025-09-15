-- Remove body_area_groups table and create direct relationship between specifications and their selectable areas
DROP TABLE IF EXISTS body_area_groups CASCADE;
DROP TABLE IF EXISTS appointment_selected_areas CASCADE;

-- Add area selection fields directly to procedure_specifications
ALTER TABLE procedure_specifications 
ADD COLUMN IF NOT EXISTS has_area_selection boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS area_shapes jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gender text DEFAULT 'female';

-- Update existing specifications to have area selection if procedure requires it
UPDATE procedure_specifications ps
SET has_area_selection = true
FROM procedures p
WHERE ps.procedure_id = p.id 
AND (p.requires_body_image_selection = true OR p.requires_area_selection = true);