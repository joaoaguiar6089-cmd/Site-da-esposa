-- Verificar os dados de sessão nos agendamentos de Epilação
SELECT 
  a.id,
  a.appointment_date,
  a.appointment_time,
  a.session_number,
  a.total_sessions,
  p.name as procedure_name,
  p.sessions as procedure_sessions,
  c.nome || ' ' || c.sobrenome as client_name
FROM appointments a
JOIN procedures p ON a.procedure_id = p.id
JOIN clients c ON a.client_id = c.id
WHERE p.name ILIKE '%epilação%'
ORDER BY a.appointment_date, a.appointment_time;
