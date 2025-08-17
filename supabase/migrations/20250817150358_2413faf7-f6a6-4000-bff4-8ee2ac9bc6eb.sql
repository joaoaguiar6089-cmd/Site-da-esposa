-- Criar função para atualizar telefone do cliente
CREATE OR REPLACE FUNCTION public.update_client_phone_simple(p_client_id uuid, p_cpf text, p_phone text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar telefone na tabela clients
  UPDATE public.clients 
  SET celular = p_phone, 
      updated_at = NOW()
  WHERE id = p_client_id AND cpf = p_cpf;
  
  -- Verificar se a atualização foi bem-sucedida
  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;