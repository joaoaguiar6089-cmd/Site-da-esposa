-- Inserir profissionais básicos para o sistema funcionar
INSERT INTO public.professionals (name, email, phone, cpf) VALUES
('Dra. Ana Silva', 'ana.silva@clinica.com', '51999887766', '12345678901'),
('Dr. Carlos Santos', 'carlos.santos@clinica.com', '51988776655', '23456789012'),
('Dra. Maria Oliveira', 'maria.oliveira@clinica.com', '51977665544', '34567890123')
ON CONFLICT (cpf) DO NOTHING;