-- Recriar a função com mais logging para debug
CREATE OR REPLACE FUNCTION public.verify_resumo_credentials(
  p_username TEXT,
  p_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stored_password TEXT;
  v_is_active BOOLEAN;
  v_result BOOLEAN;
BEGIN
  -- Buscar dados
  SELECT password, is_active INTO v_stored_password, v_is_active
  FROM public.resumo_credentials
  WHERE username = p_username;
  
  -- Log para debug
  RAISE LOG 'Username: %, Found password: %, Is active: %, Input password: %', 
    p_username, v_stored_password, v_is_active, p_password;
  
  -- Verificar se encontrou
  IF v_stored_password IS NULL THEN
    RAISE LOG 'User not found';
    RETURN FALSE;
  END IF;
  
  -- Verificar se está ativo
  IF v_is_active IS NOT TRUE THEN
    RAISE LOG 'User not active';
    RETURN FALSE;
  END IF;
  
  -- Comparar senhas
  v_result := (v_stored_password = p_password);
  RAISE LOG 'Password match result: %', v_result;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Exception in verify_resumo_credentials: %', SQLERRM;
    RETURN FALSE;
END;
$$;