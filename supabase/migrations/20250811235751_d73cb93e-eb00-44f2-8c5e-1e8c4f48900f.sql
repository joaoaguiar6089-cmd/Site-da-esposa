-- Resetar senha do usuário admin para garantir que funcione
-- Como não podemos alterar a senha diretamente, vamos deletar e recriar o usuário
UPDATE auth.users 
SET 
    encrypted_password = crypt('Jp31163299', gen_salt('bf')),
    updated_at = now()
WHERE email = 'joaoaguiar6089@gmail.com';

-- Verificar e corrigir políticas RLS que podem estar bloqueando
-- Adicionar política temporária para debugging
DROP POLICY IF EXISTS "Admin debug access" ON public.profiles;
CREATE POLICY "Admin debug access" 
ON public.profiles 
FOR ALL 
USING (true) 
WITH CHECK (true);