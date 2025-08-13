-- Deletar todos os registros relacionados ao email enfesteta.karoline@gmail.com
-- User ID: 2f910934-4c61-46bd-b4a5-5ee5a8dc5553

-- 1. Deletar da tabela admin_users se existir
DELETE FROM admin_users WHERE user_id = '2f910934-4c61-46bd-b4a5-5ee5a8dc5553';

-- 2. Deletar da tabela profiles se existir  
DELETE FROM profiles WHERE user_id = '2f910934-4c61-46bd-b4a5-5ee5a8dc5553';

-- 3. Deletar qualquer registro com o email específico na tabela admin_users
DELETE FROM admin_users WHERE email = 'enfesteta.karoline@gmail.com';