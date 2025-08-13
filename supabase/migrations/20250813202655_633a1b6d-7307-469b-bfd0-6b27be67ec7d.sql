-- Atualizar os emails faltantes na tabela admin_users baseado nos CPFs conhecidos
UPDATE admin_users 
SET email = CASE 
  WHEN user_id IN (
    SELECT user_id FROM profiles WHERE cpf = '47164591873'
  ) THEN 'joaoaguiar6089@gmail.com'
  WHEN user_id IN (
    SELECT user_id FROM profiles WHERE cpf = '01803919256'  
  ) THEN 'admin@clinica.com'
  ELSE email
END
WHERE email IS NULL;