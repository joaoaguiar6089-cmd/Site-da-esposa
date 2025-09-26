-- Criar tabela para armazenar anotações dos documentos
CREATE TABLE public.document_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES client_documents(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  annotation_type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  position_x NUMERIC,
  position_y NUMERIC,
  page_number INTEGER DEFAULT 1,
  style_properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_annotations ENABLE ROW LEVEL SECURITY;

-- Create policies for document annotations
CREATE POLICY "Admins can manage all document annotations" 
ON public.document_annotations 
FOR ALL 
USING (is_active_admin());

CREATE POLICY "Users can view annotations on their documents" 
ON public.document_annotations 
FOR SELECT 
USING (
  document_id IN (
    SELECT cd.id 
    FROM client_documents cd 
    JOIN clients c ON cd.client_id = c.id 
    WHERE c.cpf = get_current_user_cpf()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_document_annotations_updated_at
BEFORE UPDATE ON public.document_annotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_document_annotations_document_id ON public.document_annotations(document_id);
CREATE INDEX idx_document_annotations_page ON public.document_annotations(document_id, page_number);