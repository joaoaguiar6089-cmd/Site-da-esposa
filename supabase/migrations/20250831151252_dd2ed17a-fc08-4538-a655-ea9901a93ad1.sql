-- Corrigir função de verificação de lembretes para usar fuso horário correto de Brasília
CREATE OR REPLACE FUNCTION public.check_and_send_reminders()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    current_time_only time;
    reminder_time_setting time;
    reminder_active boolean;
    last_execution_date date;
    response_data jsonb;
BEGIN
    -- Get current time (Brazil timezone - São Paulo)
    current_time_only := (now() AT TIME ZONE 'America/Sao_Paulo')::time;
    
    -- Get reminder settings
    SELECT reminder_time, is_active INTO reminder_time_setting, reminder_active
    FROM public.reminder_settings 
    WHERE is_active = true 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- If no active settings found, exit
    IF reminder_time_setting IS NULL OR reminder_active IS FALSE THEN
        RETURN;
    END IF;
    
    -- Check if current time matches reminder time (within 5 minutes for better reliability)
    IF ABS(EXTRACT(EPOCH FROM (current_time_only - reminder_time_setting))) <= 300 THEN
        
        -- Check if we already sent reminders today (Brazil timezone)
        SELECT (event_details->>'execution_date')::date INTO last_execution_date
        FROM public.security_audit_log 
        WHERE event_type = 'automatic_reminder_executed'
        ORDER BY created_at DESC 
        LIMIT 1;
        
        -- Only send if we haven't sent today (using Brazil date)
        IF last_execution_date IS NULL OR last_execution_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
            
            -- Call the send-reminder edge function
            SELECT content::jsonb INTO response_data
            FROM http((
                'POST',
                'https://ejqsaloqrczyfiqljcym.supabase.co/functions/v1/send-reminder',
                ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true))],
                'application/json',
                '{}'
            ));
            
            -- Log the execution with Brazil timezone date
            INSERT INTO public.security_audit_log (
                user_id, 
                event_type, 
                event_details, 
                created_at
            ) VALUES (
                NULL,
                'automatic_reminder_executed',
                jsonb_build_object(
                    'response', response_data, 
                    'execution_time', current_time_only::text,
                    'execution_date', (now() AT TIME ZONE 'America/Sao_Paulo')::date,
                    'timezone', 'America/Sao_Paulo',
                    'timestamp', now()
                ),
                now()
            );
            
        END IF;
    END IF;
END;
$function$;