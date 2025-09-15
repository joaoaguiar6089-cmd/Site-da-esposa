-- Remove strict CPF validation constraint and create a more flexible one
-- This allows temporary CPFs for clients without CPF

-- First, let's check and drop the existing constraint if it exists
DO $$ 
BEGIN
    -- Try to drop the constraint if it exists
    ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS valid_cpf;
EXCEPTION
    WHEN others THEN
        -- Ignore error if constraint doesn't exist
        NULL;
END $$;

-- Add a more flexible CPF constraint that allows temporary CPFs
ALTER TABLE public.clients 
ADD CONSTRAINT valid_cpf_flexible 
CHECK (
    -- Allow temporary CPFs that start with 'temp_'
    cpf LIKE 'temp_%' OR
    -- Or allow valid CPF format (11 digits)
    (cpf ~ '^[0-9]{11}$' AND length(cpf) = 11)
);