-- Adicionar campos de horário na tabela city_availability
ALTER TABLE public.city_availability 
ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT '18:00';

-- Atualizar registros existentes com horários padrão se estiverem vazios
UPDATE public.city_availability 
SET 
  start_time = '08:00'
WHERE start_time IS NULL;

UPDATE public.city_availability 
SET 
  end_time = '18:00' 
WHERE end_time IS NULL;