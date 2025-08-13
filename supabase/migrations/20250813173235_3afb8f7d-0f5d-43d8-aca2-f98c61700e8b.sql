-- Atualizar o número de celular do cliente
UPDATE public.clients 
SET celular = '51997080499', updated_at = now()
WHERE cpf = '47164591873';