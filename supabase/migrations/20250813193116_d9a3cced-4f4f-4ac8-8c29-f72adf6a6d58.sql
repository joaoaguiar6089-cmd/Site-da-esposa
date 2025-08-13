-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job to send reminders daily at 18:00 (6 PM)
-- This will send reminders for appointments scheduled for tomorrow
SELECT cron.schedule(
  'daily-appointment-reminders',
  '0 18 * * *', -- At 18:00 (6 PM) every day
  $$
  SELECT
    net.http_post(
        url:='https://ejqsaloqrczyfiqljcym.supabase.co/functions/v1/send-reminder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXNhbG9xcmN6eWZpcWxqY3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDQ0MjUsImV4cCI6MjA2OTkyMDQyNX0.kefVEuV7Yu7vWLbfoAjBer57dwu34h4uTlw6IKU5mcA"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);