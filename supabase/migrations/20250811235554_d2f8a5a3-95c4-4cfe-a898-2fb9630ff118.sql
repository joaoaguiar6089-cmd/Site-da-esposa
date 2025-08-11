-- Confirmar automaticamente o email do usuário admin
UPDATE auth.users 
SET email_confirmed_at = now(),
    confirmation_sent_at = now()
WHERE email = 'joaoaguiar6089@gmail.com' 
AND email_confirmed_at IS NULL;