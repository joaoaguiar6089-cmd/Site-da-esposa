-- Add time fields to city_availability table
ALTER TABLE city_availability 
ADD COLUMN start_time TIME DEFAULT '09:00:00'::time,
ADD COLUMN end_time TIME DEFAULT '18:00:00'::time;