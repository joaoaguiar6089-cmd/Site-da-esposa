-- Verificar e corrigir a foreign key constraint da tabela profiles
-- Primeiro, vamos ver se há uma foreign key problemática

-- Verificar se existe trigger para criar profile automaticamente
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE trigger_schema = 'auth' AND event_object_table = 'users';

-- Vamos remover a foreign key constraint problemática e recriar corretamente
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Recriar a foreign key constraint corretamente
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;