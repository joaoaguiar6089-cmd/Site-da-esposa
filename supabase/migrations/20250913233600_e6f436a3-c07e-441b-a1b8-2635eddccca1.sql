-- Configurar cron job para limpeza automática de agendamentos
-- Executa diariamente às 02:00 (horário de Brasília considerando UTC-3)
SELECT cron.schedule(
  'cleanup-old-appointments',
  '0 5 * * *', -- 05:00 UTC = 02:00 BRT
  $$
  SELECT net.http_post(
    url := 'https://ejqsaloqrczyfiqljcym.supabase.co/functions/v1/cleanup-appointments',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXNhbG9xcmN6eWZpcWxqY3ltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM0NDQyNSwiZXhwIjoyMDY5OTIwNDI1fQ.5G3dMpY-lNVl6Uv8KqLuWGfNTqvxIIIOpFsOaNnN6Z4"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);