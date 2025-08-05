-- Add DELETE policy for appointments
CREATE POLICY "Admin can delete appointments" 
ON public.appointments 
FOR DELETE 
USING (true);

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension if not already enabled  
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily reminder job at 10:00 AM
SELECT cron.schedule(
  'daily-appointment-reminders',
  '0 10 * * *', -- Every day at 10:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://ejqsaloqrczyfiqljcym.supabase.co/functions/v1/send-reminder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXNhbG9xcmN6eWZpcWxqY3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDQ0MjUsImV4cCI6MjA2OTkyMDQyNX0.kefVEuV7Yu7vWLbfoAjBer57dwu34h4uTlw6IKU5mcA"}'::jsonb,
        body:='{"action": "send_reminders"}'::jsonb
    ) as request_id;
  $$
);