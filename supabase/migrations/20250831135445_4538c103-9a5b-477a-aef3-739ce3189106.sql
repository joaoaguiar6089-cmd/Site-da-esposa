-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to send daily reminders by calling the edge function
CREATE OR REPLACE FUNCTION send_daily_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    response_data jsonb;
BEGIN
    -- Call the send-reminder edge function
    SELECT content::jsonb INTO response_data
    FROM http((
        'POST',
        'https://ejqsaloqrczyfiqljcym.supabase.co/functions/v1/send-reminder',
        ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true))],
        'application/json',
        '{}'
    ));
    
    -- Log the execution
    INSERT INTO public.security_audit_log (
        user_id, 
        event_type, 
        event_details, 
        created_at
    ) VALUES (
        NULL,
        'automatic_reminder_executed',
        jsonb_build_object('response', response_data, 'timestamp', now()),
        now()
    );
END;
$$;

-- Schedule the function to run daily at 10:00 AM (Brazil timezone)
SELECT cron.schedule(
    'daily-reminders', 
    '0 10 * * *', 
    'SELECT send_daily_reminders();'
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION send_daily_reminders() TO postgres;