-- Permitir CPF duplicado entre clientes e administradores
-- O mesmo CPF pode ser cliente e admin ao mesmo tempo

-- Remover constraint de CPF único na tabela profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_cpf_key;

-- Criar constraint único composto: user_id deve ser único (um usuário = um perfil)
-- Mas CPF pode se repetir entre diferentes usuários
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);