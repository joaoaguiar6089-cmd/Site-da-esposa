-- Corrigir função de limpeza de agendamentos adicionando search_path
CREATE OR REPLACE FUNCTION public.cleanup_old_appointments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    deleted_count integer := 0;
    cutoff_date date;
BEGIN
    -- Data de corte: 3 dias atrás
    cutoff_date := CURRENT_DATE - INTERVAL '3 days';
    
    -- Deletar agendamentos com status 'agendado' ou 'cancelado' 
    -- que são de mais de 3 dias atrás
    WITH deleted AS (
        DELETE FROM public.appointments 
        WHERE status IN ('agendado', 'cancelado')
        AND appointment_date < cutoff_date
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Log da operação de limpeza
    INSERT INTO public.security_audit_log (
        user_id, 
        event_type, 
        event_details, 
        created_at
    ) VALUES (
        NULL,
        'automatic_appointments_cleanup',
        jsonb_build_object(
            'deleted_count', deleted_count,
            'cutoff_date', cutoff_date,
            'cleanup_date', CURRENT_DATE
        ),
        now()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'deleted_count', deleted_count,
        'cutoff_date', cutoff_date
    );
END;
$$;