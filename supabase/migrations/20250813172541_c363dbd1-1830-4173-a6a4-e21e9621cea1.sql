-- Inserir cliente de teste para o CPF do admin (área de agendamento independente)
INSERT INTO public.clients (cpf, nome, sobrenome, celular, created_at, updated_at)
VALUES ('47164591873', 'João', 'Aguiar', '(97) 98438-7295', now(), now())
ON CONFLICT (cpf) DO UPDATE SET
  nome = EXCLUDED.nome,
  sobrenome = EXCLUDED.sobrenome,
  celular = EXCLUDED.celular,
  updated_at = now();