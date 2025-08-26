-- Criar tabela para promoções
CREATE TABLE public.promotions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Política para admins gerenciarem promoções
CREATE POLICY "Admins can manage promotions" 
ON public.promotions 
FOR ALL 
USING (is_active_admin());

-- Política para qualquer um visualizar promoções ativas
CREATE POLICY "Anyone can view active promotions" 
ON public.promotions 
FOR SELECT 
USING (is_active = true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket para imagens de promoções se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('promotion-images', 'promotion-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket de promoções
CREATE POLICY "Anyone can view promotion images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'promotion-images');

CREATE POLICY "Admins can upload promotion images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'promotion-images' AND is_active_admin());

CREATE POLICY "Admins can update promotion images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'promotion-images' AND is_active_admin());

CREATE POLICY "Admins can delete promotion images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'promotion-images' AND is_active_admin());