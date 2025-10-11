-- Script para corrigir os agendamentos de Epilação Pacote 1 existentes
-- Execute este script no SQL Editor do Supabase

-- Primeiro, vamos ver quais são os agendamentos
SELECT 
  a.id,
  a.appointment_date,
  a.appointment_time,
  a.session_number,
  a.total_sessions,
  p.name,
  p.sessions,
  c.nome || ' ' || c.sobrenome as client_name,
  ROW_NUMBER() OVER (PARTITION BY a.client_id, a.procedure_id ORDER BY a.appointment_date, a.appointment_time) as calculated_session
FROM appointments a
JOIN procedures p ON a.procedure_id = p.id
JOIN clients c ON a.client_id = c.id
WHERE p.name ILIKE '%epilação%pacote%'
  AND a.status != 'cancelado'
ORDER BY c.id, a.appointment_date, a.appointment_time;

-- DEPOIS DE VERIFICAR, execute este UPDATE para corrigir:
-- (Descomente as linhas abaixo após verificar os dados acima)

/*
WITH ranked_appointments AS (
  SELECT 
    a.id,
    p.sessions,
    ROW_NUMBER() OVER (PARTITION BY a.client_id, a.procedure_id ORDER BY a.appointment_date, a.appointment_time) as session_number
  FROM appointments a
  JOIN procedures p ON a.procedure_id = p.id
  WHERE p.name ILIKE '%epilação%pacote%'
    AND a.status != 'cancelado'
)
UPDATE appointments
SET 
  session_number = ranked_appointments.session_number,
  total_sessions = ranked_appointments.sessions
FROM ranked_appointments
WHERE appointments.id = ranked_appointments.id;
*/

-- Após o UPDATE, execute este SELECT para confirmar:
/*
SELECT 
  a.id,
  a.appointment_date,
  a.appointment_time,
  a.session_number,
  a.total_sessions,
  p.name,
  c.nome || ' ' || c.sobrenome as client_name
FROM appointments a
JOIN procedures p ON a.procedure_id = p.id
JOIN clients c ON a.client_id = c.id
WHERE p.name ILIKE '%epilação%pacote%'
  AND a.status != 'cancelado'
ORDER BY c.id, a.appointment_date, a.appointment_time;
*/
