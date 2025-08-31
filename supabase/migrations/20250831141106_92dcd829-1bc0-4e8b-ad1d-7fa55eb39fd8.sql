-- Remove old cron jobs that might be conflicting
SELECT cron.unschedule('daily-appointment-reminders');
SELECT cron.unschedule('check-reminder-time');

-- Ensure only our new smart-reminder-checker is running
SELECT cron.unschedule('smart-reminder-checker');
SELECT cron.schedule(
    'smart-reminder-checker', 
    '* * * * *',  -- Every minute
    'SELECT check_and_send_reminders();'
);