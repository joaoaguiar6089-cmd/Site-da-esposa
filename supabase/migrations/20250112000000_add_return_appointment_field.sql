-- Add return_of_appointment_id field to appointments table
-- This field tracks if an appointment is a return/follow-up of another appointment

ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS return_of_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_return_of ON public.appointments(return_of_appointment_id);

-- Add comment
COMMENT ON COLUMN public.appointments.return_of_appointment_id IS 'ID do agendamento original caso este seja um retorno';
