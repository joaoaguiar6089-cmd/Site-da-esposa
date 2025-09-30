-- Add address fields to city_settings
ALTER TABLE public.city_settings
  ADD COLUMN IF NOT EXISTS clinic_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS map_url TEXT;
