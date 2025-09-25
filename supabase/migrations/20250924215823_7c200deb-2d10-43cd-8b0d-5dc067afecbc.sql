-- Create client_documents table
CREATE TABLE public.client_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'pdf',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by_admin UUID,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all client documents" 
ON public.client_documents 
FOR ALL 
USING (is_active_admin());

CREATE POLICY "Clients can view their own documents" 
ON public.client_documents 
FOR SELECT 
USING (client_id IN (
  SELECT c.id 
  FROM clients c 
  WHERE c.cpf = get_current_user_cpf()
));

-- Create storage bucket for client documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-documents', 'client-documents', false);

-- Create storage policies
CREATE POLICY "Admins can manage client documents" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'client-documents' AND is_active_admin());

CREATE POLICY "Clients can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'client-documents' AND name LIKE (get_current_user_cpf() || '/%'));

-- Create trigger for updated_at
CREATE TRIGGER update_client_documents_updated_at
BEFORE UPDATE ON public.client_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();