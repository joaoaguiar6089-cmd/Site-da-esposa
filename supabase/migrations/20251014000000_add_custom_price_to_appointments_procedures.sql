-- Add custom_price column to appointments_procedures table
-- This allows admin to set custom prices for specific appointments

ALTER TABLE appointments_procedures 
ADD COLUMN IF NOT EXISTS custom_price NUMERIC(10,2);

-- Add comment to explain the column
COMMENT ON COLUMN appointments_procedures.custom_price IS 'Custom price for this specific appointment. If NULL, use the procedure default price.';
