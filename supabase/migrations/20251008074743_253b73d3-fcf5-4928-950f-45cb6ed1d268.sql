-- Tabela de materiais/itens do estoque
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_name TEXT NOT NULL,
  unit TEXT NOT NULL, -- ml, litro, caixa, unidade, etc
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de transações (entradas e saídas)
CREATE TABLE public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('entrada', 'saida')),
  transaction_date DATE NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC, -- preço unitário (usado para entradas)
  total_value NUMERIC, -- valor total da transação
  invoice_url TEXT, -- URL da nota fiscal
  procedure_id UUID REFERENCES public.procedures(id), -- opcional, apenas para saídas
  deleted_at TIMESTAMP WITH TIME ZONE, -- soft delete para manter histórico
  deleted_by UUID REFERENCES public.admin_users(user_id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de sugestões de saída baseadas em agendamentos
CREATE TABLE public.inventory_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  suggested_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'ignored')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(appointment_id)
);

-- Índices para performance
CREATE INDEX idx_inventory_transactions_item_id ON public.inventory_transactions(item_id);
CREATE INDEX idx_inventory_transactions_date ON public.inventory_transactions(transaction_date);
CREATE INDEX idx_inventory_transactions_type ON public.inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_deleted ON public.inventory_transactions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_suggestions_appointment ON public.inventory_suggestions(appointment_id);
CREATE INDEX idx_inventory_suggestions_status ON public.inventory_suggestions(status);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_suggestions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem gerenciar estoque
CREATE POLICY "Admins can manage inventory items"
  ON public.inventory_items
  FOR ALL
  USING (is_active_admin());

CREATE POLICY "Admins can manage inventory transactions"
  ON public.inventory_transactions
  FOR ALL
  USING (is_active_admin());

CREATE POLICY "Admins can manage inventory suggestions"
  ON public.inventory_suggestions
  FOR ALL
  USING (is_active_admin());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_transactions_updated_at
  BEFORE UPDATE ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_suggestions_updated_at
  BEFORE UPDATE ON public.inventory_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para calcular saldo atual de um item
CREATE OR REPLACE FUNCTION public.get_inventory_balance(p_item_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC := 0;
BEGIN
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN transaction_type = 'entrada' THEN quantity
        WHEN transaction_type = 'saida' THEN -quantity
        ELSE 0
      END
    ), 0) INTO v_balance
  FROM public.inventory_transactions
  WHERE item_id = p_item_id
    AND deleted_at IS NULL;
  
  RETURN v_balance;
END;
$$;

-- Função para obter o último preço unitário de um item
CREATE OR REPLACE FUNCTION public.get_latest_unit_price(p_item_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit_price NUMERIC;
BEGIN
  SELECT unit_price INTO v_unit_price
  FROM public.inventory_transactions
  WHERE item_id = p_item_id
    AND transaction_type = 'entrada'
    AND unit_price IS NOT NULL
    AND deleted_at IS NULL
  ORDER BY transaction_date DESC, created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_unit_price, 0);
END;
$$;